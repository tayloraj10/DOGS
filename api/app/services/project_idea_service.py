import secrets
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Category as CategoryModel,
    IdeaInterest as IdeaInterestModel,
    IdeaSimilarApp as IdeaSimilarAppModel,
    Project as ProjectModel,
    ProjectIdea as ProjectIdeaModel,
    ProjectMember as ProjectMemberModel,
)
from app.schemas import (
    CategorySlug,
    IdeaInterest,
    IdeaInterestCreate,
    ProjectIdea,
    ProjectIdeaCreate,
    ProjectIdeaPublicUpdate,
    ProjectIdeaStatus,
    ProjectIdeaUpdate,
    SimilarApp,
    SimilarAppCreate,
    SimilarMatch,
)
from app.services.directory_service import resolve_categories
from app.services.shared_contact import resolve_shared_contact

# Below this trigram similarity score, a match isn't worth surfacing to a submitter.
# Table sizes are small enough (low hundreds of rows) that a plain similarity() scan
# is fine; revisit with an index-friendly `<->` query if this ever needs to scale.
SIMILARITY_THRESHOLD = 0.15

# Statuses an idea can't move on from — reject/merge are blocked once reached.
_TERMINAL_STATUSES = {
    ProjectIdeaStatus.rejected.value,
    ProjectIdeaStatus.merged.value,
    ProjectIdeaStatus.converted.value,
}


def idea_to_schema(idea: ProjectIdeaModel) -> ProjectIdea:
    categories = [CategorySlug(c.slug) for c in idea.categories]
    similar_apps = [SimilarApp.model_validate(app) for app in idea.similar_apps]
    interested = [
        IdeaInterest(
            user_id=interest.user_id,
            name=interest.user.name,
            photo_url=interest.user.photo_url,
            shared_contact=resolve_shared_contact(interest.user, interest.shared_fields),
            created_at=interest.created_at,
        )
        for interest in idea.interests
    ]

    return ProjectIdea(
        id=idea.id,
        name=idea.name,
        description=idea.description,
        categories=categories,
        suggested_category=idea.suggested_category,
        status=ProjectIdeaStatus(idea.status),
        submitter_user_id=idea.submitter_user_id,
        submitter_name=idea.submitter.name if idea.submitter else None,
        merged_into_project_id=idea.merged_into_project_id,
        interested=interested,
        similar_apps=similar_apps,
        created_at=idea.created_at,
        updated_at=idea.updated_at,
    )


def get_idea(db: Session, idea_id: UUID) -> ProjectIdeaModel | None:
    return (
        db.query(ProjectIdeaModel)
        .options(
            selectinload(ProjectIdeaModel.categories),
            selectinload(ProjectIdeaModel.similar_apps),
            selectinload(ProjectIdeaModel.interests).selectinload(IdeaInterestModel.user),
            selectinload(ProjectIdeaModel.submitter),
        )
        .filter(ProjectIdeaModel.id == idea_id)
        .first()
    )


def list_ideas(
    db: Session,
    *,
    limit: int = 50,
    offset: int = 0,
    category_slug: CategorySlug | None = None,
    status: ProjectIdeaStatus | None = None,
) -> list[ProjectIdeaModel]:
    q = db.query(ProjectIdeaModel).options(
        selectinload(ProjectIdeaModel.categories),
        selectinload(ProjectIdeaModel.similar_apps),
        selectinload(ProjectIdeaModel.interests).selectinload(IdeaInterestModel.user),
        selectinload(ProjectIdeaModel.submitter),
    )
    if category_slug:
        q = q.join(ProjectIdeaModel.categories).filter(CategoryModel.slug == category_slug)
    if status:
        q = q.filter(ProjectIdeaModel.status == status.value)
    return q.order_by(ProjectIdeaModel.created_at.desc()).offset(offset).limit(limit).all()


def apply_create_data(idea: ProjectIdeaModel, body: ProjectIdeaCreate) -> None:
    idea.name = body.name[:255]
    idea.description = body.description
    idea.suggested_category = (
        body.suggested_category.strip()[:255] if body.suggested_category else None
    )


def stamp_submitter(idea: ProjectIdeaModel, user_id: UUID | None) -> None:
    """No-op if signed out — anonymous submission relies on the edit_token flow instead,
    same pattern as directory entries and projects."""
    if user_id is None:
        return
    idea.submitter_user_id = user_id


def get_or_create_edit_token(db: Session, idea: ProjectIdeaModel) -> str:
    if not idea.edit_token:
        idea.edit_token = secrets.token_urlsafe(24)
        db.commit()
    return idea.edit_token


def apply_update_data(
    idea: ProjectIdeaModel, body: ProjectIdeaUpdate | ProjectIdeaPublicUpdate
) -> None:
    fields = body.model_fields_set
    if "name" in fields and body.name is not None:
        idea.name = body.name[:255]
    if "description" in fields and body.description is not None:
        idea.description = body.description
    if "suggested_category" in fields:
        idea.suggested_category = (
            body.suggested_category.strip()[:255] if body.suggested_category else None
        )
    if isinstance(body, ProjectIdeaUpdate) and "status" in fields and body.status is not None:
        idea.status = body.status.value


def set_idea_categories(db: Session, idea: ProjectIdeaModel, slugs: list[CategorySlug]) -> None:
    idea.categories = resolve_categories(db, slugs)


def add_similar_app(
    db: Session, idea: ProjectIdeaModel, body: SimilarAppCreate, user_id: UUID | None
) -> IdeaSimilarAppModel:
    app = IdeaSimilarAppModel(
        idea_id=idea.id,
        url=body.url,
        name=body.name[:255] if body.name else None,
        note=body.note,
        added_by_user_id=user_id,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def search_similar(
    db: Session,
    *,
    name: str,
    description: str = "",
    limit: int = 5,
    exclude_idea_id: UUID | None = None,
) -> list[SimilarMatch]:
    """Trigram similarity search across both project_ideas and published/pending projects,
    so a submitter is warned whether they're duplicating an idea or something already built."""
    query_text = f"{name} {description}".strip()
    if not query_text:
        return []

    idea_combined = func.concat(
        ProjectIdeaModel.name, " ", func.coalesce(ProjectIdeaModel.description, "")
    )
    idea_score = func.similarity(idea_combined, query_text)
    idea_q = (
        db.query(
            ProjectIdeaModel.id,
            ProjectIdeaModel.name,
            ProjectIdeaModel.description,
            idea_score.label("score"),
        )
        .filter(ProjectIdeaModel.status != ProjectIdeaStatus.rejected.value)
        .filter(idea_score >= SIMILARITY_THRESHOLD)
    )
    if exclude_idea_id:
        idea_q = idea_q.filter(ProjectIdeaModel.id != exclude_idea_id)
    idea_rows = idea_q.order_by(idea_score.desc()).limit(limit).all()

    project_combined = func.concat(
        ProjectModel.name, " ", func.coalesce(ProjectModel.description, "")
    )
    project_score = func.similarity(project_combined, query_text)
    project_rows = (
        db.query(
            ProjectModel.id,
            ProjectModel.name,
            ProjectModel.description,
            project_score.label("score"),
        )
        .filter(project_score >= SIMILARITY_THRESHOLD)
        .order_by(project_score.desc())
        .limit(limit)
        .all()
    )

    matches = [
        SimilarMatch(
            kind="idea",
            id=row.id,
            name=row.name,
            description=row.description,
            similarity=float(row.score),
        )
        for row in idea_rows
    ] + [
        SimilarMatch(
            kind="project",
            id=row.id,
            name=row.name,
            description=row.description,
            similarity=float(row.score),
        )
        for row in project_rows
    ]
    matches.sort(key=lambda m: m.similarity, reverse=True)
    return matches[:limit]


def approve_idea(db: Session, idea: ProjectIdeaModel) -> ProjectIdeaModel:
    """Marks a pending idea as vetted (legitimate, not a duplicate) so it's open for a
    builder to claim. This does NOT create a project — Tech for Good projects are for
    work that's already underway with a team, so that only happens once someone claims
    the idea and an admin converts it (see convert_idea)."""
    if idea.status != ProjectIdeaStatus.pending.value:
        raise ValueError(f"Idea is already {idea.status}, cannot approve")
    idea.status = ProjectIdeaStatus.approved.value
    db.commit()
    db.refresh(idea)
    return idea


def express_interest(
    db: Session, idea: ProjectIdeaModel, user_id: UUID, body: IdeaInterestCreate
) -> ProjectIdeaModel:
    """Self-service: any signed-in user can mark themselves interested in an approved idea
    to signal they'd like to help build it. Not exclusive — any number of people can be
    interested in the same idea at once. Doesn't create a project by itself — an admin
    still confirms a team is actually underway before converting it (see convert_idea)."""
    if idea.status not in (ProjectIdeaStatus.approved.value, ProjectIdeaStatus.claimed.value):
        raise ValueError(f"Idea is {idea.status}, must be approved before anyone can express interest")
    existing = (
        db.query(IdeaInterestModel)
        .filter(IdeaInterestModel.idea_id == idea.id, IdeaInterestModel.user_id == user_id)
        .first()
    )
    if existing:
        raise ValueError("Already marked as interested in this idea")

    db.add(
        IdeaInterestModel(idea_id=idea.id, user_id=user_id, shared_fields=body.shared_fields)
    )
    idea.status = ProjectIdeaStatus.claimed.value
    db.commit()
    return get_idea(db, idea.id)


def withdraw_interest(db: Session, idea: ProjectIdeaModel, user_id: UUID) -> ProjectIdeaModel:
    """Lets an interested user back out. Once nobody's left interested, the idea reverts
    to open."""
    interest = (
        db.query(IdeaInterestModel)
        .filter(IdeaInterestModel.idea_id == idea.id, IdeaInterestModel.user_id == user_id)
        .first()
    )
    if not interest:
        raise ValueError("Not marked as interested in this idea")
    db.delete(interest)
    db.flush()

    remaining = (
        db.query(IdeaInterestModel).filter(IdeaInterestModel.idea_id == idea.id).count()
    )
    if remaining == 0 and idea.status == ProjectIdeaStatus.claimed.value:
        idea.status = ProjectIdeaStatus.approved.value

    db.commit()
    return get_idea(db, idea.id)


def convert_idea(db: Session, idea: ProjectIdeaModel) -> ProjectModel:
    """Promotes a claimed idea into a real Project, seating every interested user as a
    member (carrying over their chosen shared_fields) and marking the original submitter
    as the project's originator. This is the only path that creates a Tech for Good project
    from an idea, and is reserved for admin use once a team is confirmed to be actively
    building it. The idea keeps its similar_apps rows and is linked to the new project via
    merged_into_project_id, so its prior-art links stay discoverable rather than being
    duplicated onto a project-side table."""
    if idea.status != ProjectIdeaStatus.claimed.value:
        raise ValueError(f"Idea is {idea.status}, must be claimed before it can be converted")

    project = ProjectModel(
        name=idea.name,
        description=idea.description,
        suggested_category=idea.suggested_category,
        originator_user_id=idea.submitter_user_id,
    )
    project.categories = list(idea.categories)
    db.add(project)
    db.flush()

    for interest in idea.interests:
        db.add(
            ProjectMemberModel(
                project_id=project.id,
                user_id=interest.user_id,
                shared_fields=interest.shared_fields,
            )
        )

    idea.status = ProjectIdeaStatus.converted.value
    idea.merged_into_project_id = project.id

    db.commit()
    db.refresh(project)
    return project


def reject_idea(db: Session, idea: ProjectIdeaModel) -> ProjectIdeaModel:
    if idea.status in _TERMINAL_STATUSES:
        raise ValueError(f"Idea is already {idea.status}, cannot reject")
    idea.status = ProjectIdeaStatus.rejected.value
    db.commit()
    db.refresh(idea)
    return idea


def merge_idea(db: Session, idea: ProjectIdeaModel, project_id: UUID) -> ProjectIdeaModel:
    """Resolves an idea as a duplicate of an already-existing project, without creating a
    new one."""
    if idea.status in _TERMINAL_STATUSES:
        raise ValueError(f"Idea is already {idea.status}, cannot merge")
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise ValueError("Target project not found")

    idea.status = ProjectIdeaStatus.merged.value
    idea.merged_into_project_id = project.id
    db.commit()
    db.refresh(idea)
    return idea

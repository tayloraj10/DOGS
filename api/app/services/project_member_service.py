from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.models import ProjectMember as ProjectMemberModel
from app.schemas import ProjectMember, ProjectMemberJoin, ProjectMemberUpdate
from app.services.shared_contact import resolve_shared_contact


def member_to_schema(
    member: ProjectMemberModel, originator_user_id: UUID | None = None
) -> ProjectMember:
    return ProjectMember(
        user_id=member.user_id,
        name=member.user.name,
        photo_url=member.user.photo_url,
        is_originator=originator_user_id is not None and member.user_id == originator_user_id,
        shared_contact=resolve_shared_contact(member.user, member.shared_fields),
        joined_at=member.joined_at,
    )


def list_members(db: Session, project_id: UUID) -> list[ProjectMemberModel]:
    return (
        db.query(ProjectMemberModel)
        .options(joinedload(ProjectMemberModel.user))
        .filter(ProjectMemberModel.project_id == project_id)
        .order_by(ProjectMemberModel.joined_at.asc())
        .all()
    )


def get_member(db: Session, project_id: UUID, user_id: UUID) -> ProjectMemberModel | None:
    return (
        db.query(ProjectMemberModel)
        .options(joinedload(ProjectMemberModel.user))
        .filter(
            ProjectMemberModel.project_id == project_id, ProjectMemberModel.user_id == user_id
        )
        .first()
    )


def join_project(
    db: Session, project_id: UUID, user_id: UUID, body: ProjectMemberJoin
) -> ProjectMemberModel:
    existing = get_member(db, project_id, user_id)
    if existing:
        raise ValueError("Already a member of this project")

    member = ProjectMemberModel(
        project_id=project_id, user_id=user_id, shared_fields=body.shared_fields
    )
    db.add(member)
    db.commit()
    return get_member(db, project_id, user_id)


def leave_project(db: Session, project_id: UUID, user_id: UUID) -> None:
    member = get_member(db, project_id, user_id)
    if not member:
        raise ValueError("Not a member of this project")
    db.delete(member)
    db.commit()


def update_shared_fields(
    db: Session, member: ProjectMemberModel, body: ProjectMemberUpdate
) -> ProjectMemberModel:
    if "shared_fields" in body.model_fields_set and body.shared_fields is not None:
        member.shared_fields = body.shared_fields
    db.commit()
    db.refresh(member)
    return member

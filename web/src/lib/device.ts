export function shouldUseRedirectForAuth(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(ua);
  const isInAppWebview = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Twitter/i.test(ua);
  return isMobile || isInAppWebview;
}

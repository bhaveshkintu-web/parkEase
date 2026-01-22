export function getUserInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const firstInitial = firstName?.trim()?.charAt(0) ?? "";
  const lastInitial = lastName?.trim()?.charAt(0) ?? "";

  if (firstInitial || lastInitial) {
    return (firstInitial + lastInitial).toUpperCase();
  }

  return "U";
}

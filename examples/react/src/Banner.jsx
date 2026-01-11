export default function Banner({ variant = "info", children, style }) {
  if (!children) return null;

  const background =
    variant === "error"
      ? "#fee"
      : variant === "success"
      ? "#eaffea"
      : undefined;

  return (
    <div className="result" style={{ padding: 14, background, ...style }}>
      {children}
    </div>
  );
}

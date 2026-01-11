import { useController } from "live-cache";

export default function StatusBar({ controllerName, mutating }) {
  const active = useController(controllerName);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 10,
        color: "#555",
        fontSize: 14,
      }}
    >
      <div>
        <strong>Status:</strong>{" "}
        {active.loading ? "loading" : active.error ? "error" : "ready"}
      </div>
      <div>
        <strong>Total:</strong> {active.controller.total}
      </div>
      <div>
        <strong>Mutating:</strong> {mutating ? "yes" : "no"}
      </div>
    </div>
  );
}

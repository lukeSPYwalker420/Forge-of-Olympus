import { useEffect, useState } from "react";

export default function ProgressLog({ userId }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/progress-comparison/${userId}`)
      .then(res => res.json())
      .then(data => {
        setComparison(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <p>Loading progress data...</p>;
  if (!comparison || !comparison.weeks || comparison.weeks.length < 2)
    return <p>Log at least two full weeks to see your progress.</p>;

  return (
    <div className="card">
      <h2>📈 Progress Log – Week 1 vs. Week {comparison.weeks.length}</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Lift</th>
              <th>Week 1 Weight (kg)</th>
              <th>Week {comparison.weeks.length} Weight (kg)</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {comparison.lifts.map(lift => (
              <tr key={lift.name} style={{ borderTop: "1px solid #333" }}>
                <td style={{ padding: "8px" }}>{lift.name}</td>
                <td style={{ padding: "8px" }}>{lift.firstWeight || "—"}</td>
                <td style={{ padding: "8px" }}>{lift.lastWeight || "—"}</td>
                <td style={{ padding: "8px", color: lift.change > 0 ? "#4caf50" : lift.change < 0 ? "#ff5555" : "#aaa" }}>
                  {lift.change > 0 ? `+${lift.change}` : lift.change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
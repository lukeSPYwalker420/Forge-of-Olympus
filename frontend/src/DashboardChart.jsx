import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

export default function DashboardChart({ userId, liftName }) {
  const [data, setData] = useState([]);
  useEffect(() => {
    if (!userId || !liftName) return;
    fetch(`/api/1rm-history/${userId}/${encodeURIComponent(liftName)}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error(err));
  }, [userId, liftName]);
  if (data.length === 0) return <p style={{color:"var(--text-gray)"}}>No data yet</p>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString()} stroke="var(--text-gray)"/>
        <YAxis stroke="var(--text-gray)"/>
        <Tooltip contentStyle={{backgroundColor:"var(--card-bg)", borderColor:"var(--accent)"}}/>
        <Line type="monotone" dataKey="estimated1RM" stroke="var(--accent)" strokeWidth={2}/>
      </LineChart>
    </ResponsiveContainer>
  );
}
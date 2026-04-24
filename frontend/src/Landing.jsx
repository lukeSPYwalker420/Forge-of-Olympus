export default function Landing() {
  const handleStart = () => {
    window.location.href = '/';
  };
  return (
    <div style={{ textAlign: 'center', padding: '40px', background: '#0a0c10', minHeight: '100vh' }}>
      <h1 style={{ color: '#d4af37' }}>Stop Guessing Your Weights</h1>
      <p>Adaptive training that learns from every rep.</p>
      <button onClick={handleStart} style={{ background: '#d4af37', padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer' }}>Start Free Trial</button>
    </div>
  );
}
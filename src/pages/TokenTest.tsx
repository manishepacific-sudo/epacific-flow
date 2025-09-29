import { useSearchParams } from 'react-router-dom';

export default function TokenTest() {
  const [searchParams] = useSearchParams();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Token Test Page</h1>
      <p><strong>Full URL:</strong> {window.location.href}</p>
      <p><strong>Search:</strong> {window.location.search}</p>
      <p><strong>Token from searchParams:</strong> {searchParams.get('token') || 'NOT FOUND'}</p>
      <p><strong>All params:</strong></p>
      <pre>{JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}</pre>
    </div>
  );
}
import { useSearchParams } from 'react-router-dom';

export default function TokenTest() {
  const [searchParams] = useSearchParams();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>Token Test Page</h1>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <p><strong>Full URL:</strong> {window.location.href}</p>
        <p><strong>Search:</strong> {window.location.search}</p>
        <p><strong>Token from searchParams:</strong> {searchParams.get('token') || 'NOT FOUND'}</p>
        <p><strong>Expected token:</strong> 3c31cc3d-5423-4009-a953-41eb3c5435b7</p>
        <p><strong>All params:</strong></p>
        <pre style={{ backgroundColor: '#f8f8f8', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}
        </pre>
        
        <div style={{ marginTop: '20px', padding: '15px', border: '2px solid #4CAF50', borderRadius: '4px', backgroundColor: '#f8fff8' }}>
          <strong>Test Instructions:</strong>
          <ol>
            <li>Copy this URL: <code>https://epacific.lovable.app/token-test?token=invite-validator</code></li>
            <li>Open it in incognito/private browser window</li>
            <li>Check if the token shows up above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
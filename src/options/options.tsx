import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { WEBSOCKET_SERVER } from '../config';

const Options = () => {
  const [server, setServer] = useState<string>(WEBSOCKET_SERVER);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    chrome.storage.local.get(['websocketServer'], (items) => {
      setServer(items.websocketServer || WEBSOCKET_SERVER);
    });
  }, []);

  const saveOptions = () => {
    chrome.storage.local.set(
      {
        websocketServer: server,
      },
      () => {
        setStatus('Options saved.');
        setTimeout(() => {
          setStatus('');
        }, 1500);
      },
    );
  };

  return (
    <div className="container">
      <div className="field">
        <label className="label">WebSocket Server:</label>
        <input
          className="input"
          style={{ width: '100%' }}
          type="text"
          value={server}
          onChange={(event) => setServer(event.target.value)}
        />
      </div>
      <div className="button-container mt-20">
        <button className="button" onClick={saveOptions}>
          Save
        </button>
        {status && <div>{status}</div>}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
);

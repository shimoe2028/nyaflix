import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FaArrowLeft, FaCheck, FaRegCopy, FaSpinner } from 'react-icons/fa6';

import { CommandType } from '../types';

// TODO: Handle errors

const Popup = () => {
  const [url, setUrl] = useState('');
  const [roomState, setRoomState] = useState<{ roomId: string | null; inviteUrl: string }>({
    roomId: null,
    inviteUrl: '',
  });
  const [hover, setHover] = useState<boolean>(false);
  const [isEnteringRoom, setIsEnteringRoom] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessageToActiveTab = async (message: any, callback?: any) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            if (callback) {
              callback(null);
            }
            return;
          }
          if (callback) {
            callback(response);
          }
        });
      }
    });
  };

  useMemo(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].url) {
        setUrl(tabs[0].url);
      }
    });
  }, []);

  // Get the room ID and invite URL.
  useEffect(() => {
    sendMessageToActiveTab(
      { command: CommandType.GET_ROOM_INFO },
      (response: { roomId?: string | null; inviteUrl?: string | null }) => {
        if (response) {
          setRoomState({
            roomId: response.roomId || null,
            inviteUrl: response.inviteUrl || '',
          });
        }
      },
    );
  }, []);

  const enterRoom = () => {
    setIsEnteringRoom(true);
    sendMessageToActiveTab(
      { command: CommandType.CREATE_ROOM, url: url },
      (response: { success: boolean; roomId?: string; inviteUrl?: string; error?: string }) => {
        if (response?.success) {
          setRoomState({ roomId: response.roomId || null, inviteUrl: response.inviteUrl || '' });
        } else {
          // TODO: Failed to connect to the server
          setRoomState({ roomId: null, inviteUrl: '' });
        }
        setIsEnteringRoom(false);
      },
    );
  };

  const exitRoom = () => {
    sendMessageToActiveTab({ command: CommandType.EXIT_ROOM });
    setRoomState({ roomId: null, inviteUrl: '' });
  };

  const isInRoom = roomState.roomId !== null;
  const inviteUrl = roomState.inviteUrl;

  return (
    <div className="text-centered container">
      <div className="embedded-input">
        <div className="input-container">
          <input
            className={!isInRoom ? 'action-button' : 'readonly-input'}
            type="text"
            ref={inputRef}
            value={isInRoom ? inviteUrl : 'Create Room'}
            readOnly={true}
            onClick={() => {
              if (!isEnteringRoom) {
                if (isInRoom) {
                  inputRef.current && inputRef.current.select();
                } else {
                  enterRoom();
                }
              }
            }}
            onMouseEnter={(e: any) => {
              if (isInRoom) {
                e.target.style.textDecoration = 'underline';
              }
            }}
            onMouseLeave={(e: any) => {
              if (isInRoom) {
                e.target.style.textDecoration = 'none';
              }
            }}
          />
        </div>

        <button
          className="button-text secondary-button"
          onClick={() => {
            if (!isEnteringRoom && isInRoom) {
              navigator.clipboard.writeText(inviteUrl).then(() => {
                inputRef.current && inputRef.current.select();
              });
            }
          }}
          hidden={!isInRoom}
        >
          <FaRegCopy
            style={{
              position: 'static',
              opacity: 1,
              transition: 'opacity 0.3s ease',
            }}
            color="#4caf50"
          />
        </button>
        <button
          className="button-text primary-button"
          onClick={() => !isEnteringRoom && (isInRoom ? exitRoom() : enterRoom())}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          hidden={!isEnteringRoom && !isInRoom}
          disabled={isEnteringRoom}
        >
          <FaSpinner
            className="spin-animation"
            style={{
              position: 'absolute',
              opacity: isEnteringRoom ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            color="#f2a100"
          />
          {/* <FaArrowRight
            style={{
              position: "absolute",
              opacity: !isEnteringRoom && !isInRoom ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
            color="grey"
          /> */}
          <FaCheck
            style={{
              position: 'absolute',
              opacity: !isEnteringRoom && isInRoom && !hover ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            color="#4caf50"
          />
          <FaArrowLeft
            style={{
              position: 'static',
              opacity: !isEnteringRoom && isInRoom && hover ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            color="#db4c3f"
          />
        </button>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);

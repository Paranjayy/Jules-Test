import React, { useState, useEffect, useRef } from 'react';

function ConfirmDeleteAllModal({ isOpen, onClose, scopeLabel, onConfirm }) {
  const [confirmationText, setConfirmationText] = useState('');
  const [countdown, setCountdown] = useState(3);
  const inputRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const REQUIRED_TEXT = "DELETE";

  useEffect(() => {
    if (isOpen) {
      setConfirmationText(''); // Reset on open
      setCountdown(3); // Reset countdown
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isOpen && countdown === 0 && confirmButtonRef.current) {
      // Optionally auto-focus the confirm button once countdown is done
      // confirmButtonRef.current.focus();
    }
  }, [isOpen, countdown]);

  const handleConfirm = () => {
    if (confirmationText === REQUIRED_TEXT && countdown === 0) {
      onConfirm();
      onClose();
    } else {
      // Shake animation or error message could be added here
      alert(`Please type "${REQUIRED_TEXT}" and wait for the countdown.`);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md text-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Confirm Deletion</h2>
        <p className="mb-3">
          Are you sure you want to delete all clips in <strong>{scopeLabel}</strong>?
        </p>
        <p className="mb-3 text-sm text-gray-600">
          This action is irreversible. To proceed, please type "<strong>{REQUIRED_TEXT}</strong>" in the box below and wait for the countdown.
        </p>
        
        <label htmlFor="confirmationText" className="sr-only">Type DELETE to confirm</label>
        <input
          ref={inputRef}
          type="text"
          id="confirmationText"
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder={`Type "${REQUIRED_TEXT}" here`}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
        />

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={confirmationText !== REQUIRED_TEXT || countdown > 0}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              (confirmationText === REQUIRED_TEXT && countdown === 0)
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {countdown > 0 ? `Confirm (${countdown})` : 'Delete All'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteAllModal;

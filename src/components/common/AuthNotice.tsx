import React from 'react';

const AuthNotice: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="mb-4 p-4 rounded border border-yellow-300 bg-yellow-50 text-yellow-800">
      <strong>Restricted Access:</strong>
      <div className="text-sm mt-1">{message || 'This section requires login. Please log in to see the full data.'}</div>
    </div>
  );
};

export default AuthNotice;

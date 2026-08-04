import React from 'react';
import { resolveProfileImageUrl } from '../utils/profileImageUrl';
import './ProfileAvatar.css';

function getInitials(username) {
  if (!username) return '?';
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

function ProfileAvatar({ username, profileImageUrl, size = 'md' }) {
  const resolvedUrl = resolveProfileImageUrl(profileImageUrl);

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={`${username || 'User'} profile`}
        className={`profile-avatar profile-avatar-${size}`}
      />
    );
  }

  return (
    <div className={`profile-avatar profile-avatar-fallback profile-avatar-${size}`} aria-hidden="true">
      {getInitials(username)}
    </div>
  );
}

export default ProfileAvatar;

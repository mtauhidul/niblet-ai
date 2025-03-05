// components/UserAvatar.tsx
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface UserAvatarProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  className = "",
  size = "md",
}) => {
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("U");

  // Define sizes
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  // Get random color based on user name
  const getRandomColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];

    // Hash the name to get a consistent color for the same user
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Get a color from the array
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    if (session?.user) {
      // Set avatar URL if available
      if (session.user.image) {
        setAvatarUrl(session.user.image);
      }

      // Set initials based on name
      if (session.user.name) {
        const nameParts = session.user.name.split(" ");
        if (nameParts.length >= 2) {
          setInitials(`${nameParts[0][0]}${nameParts[1][0]}`);
        } else if (nameParts[0]) {
          setInitials(nameParts[0][0]);
        }
      } else if (session.user.email) {
        setInitials(session.user.email[0].toUpperCase());
      }
    }
  }, [session]);

  // Generate background color based on user name
  const bgColor = session?.user?.name
    ? getRandomColor(session.user.name)
    : "bg-gray-500";

  if (avatarUrl) {
    return (
      <div
        className={`rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}
      >
        <img
          src={avatarUrl}
          alt={session?.user?.name || "User"}
          className="w-full h-full object-cover"
          onError={() => setAvatarUrl(null)} // Fallback to initials on image load error
        />
      </div>
    );
  }

  // Fallback to initials avatar
  return (
    <div
      className={`rounded-full cursor-pointer flex items-center justify-center ${sizeClasses[size]} ${bgColor} text-white font-medium uppercase ${className}`}
    >
      {initials}
    </div>
  );
};

export default UserAvatar;

import { validateAuthSession } from "@/lib/auth/authUtils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const useAuth = (redirectPath = "/auth/signin") => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      setIsValidating(true);

      if (status === "unauthenticated") {
        setIsAuthorized(false);
        router.push(redirectPath);
        return;
      }

      if (status === "authenticated" && session) {
        // Extra validation step to ensure session is valid
        const isValid = await validateAuthSession(session);

        if (!isValid) {
          toast.error("Your session has expired. Please sign in again.");
          setIsAuthorized(false);
          router.push(redirectPath);
          return;
        }

        setIsAuthorized(true);
      }

      setIsValidating(false);
    };

    validateSession();
  }, [session, status, router, redirectPath]);

  return { session, isValidating, isAuthorized };
};

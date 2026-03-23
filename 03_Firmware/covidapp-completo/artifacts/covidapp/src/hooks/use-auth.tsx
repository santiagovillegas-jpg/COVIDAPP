import { createContext, useContext, ReactNode } from "react";
import { useGetCurrentUser } from "@workspace/api-client-react";

interface UserWithRole {
  id: number;
  username: string;
  email: string;
  fullName?: string | null;
  role: string;
  insuranceCompany?: string | null;
  insuranceNumber?: string | null;
  entryMethod?: string | null;
}

interface AuthContextType {
  user: UserWithRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isTherapist: boolean;
  isNonMedicalAdmin: boolean;
  isPatient: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  isSuperAdmin: false,
  isTherapist: false,
  isNonMedicalAdmin: false,
  isPatient: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useGetCurrentUser({
    query: { retry: false },
  });

  const typedUser = user as UserWithRole | undefined;
  const role = typedUser?.role || "";

  return (
    <AuthContext.Provider
      value={{
        user: typedUser || null,
        isLoading,
        isAuthenticated: !!user && !isError,
        isAdmin: ["superadmin", "admin", "nonmedical_admin"].includes(role),
        isSuperAdmin: role === "superadmin",
        isTherapist: role === "therapist",
        isNonMedicalAdmin: role === "nonmedical_admin",
        isPatient: role === "patient",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

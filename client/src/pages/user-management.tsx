import { useQuery } from "@tanstack/react-query";
import UserManagement from "@/components/admin/user-management";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function UserManagementPage() {
  // Verificar si el usuario es admin
  const { data: adminStatus } = useQuery<{
    isAdmin: boolean;
    impersonateUserId?: string;
    user: { id: string; username: string; role: string } | null;
  }>({
    queryKey: ["/api/admin/view-status"],
  });

  // Si no es admin, mostrar mensaje de acceso denegado
  if (adminStatus && !adminStatus.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You need administrator privileges to access this page.
            </p>
            <Link href="/">
              <Button>
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          </div>
        </div>

        {/* User Management Component */}
        <UserManagement />
      </div>
    </div>
  );
}

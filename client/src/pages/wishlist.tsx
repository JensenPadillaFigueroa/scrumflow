import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Lightbulb, ArrowUp, Trash2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminCreatedBadge } from "@/components/ui/admin-created-badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import AddWishlistModal from "@/components/modals/add-wishlist-modal";
import type { WishlistItem } from "@shared/schema";

export default function Wishlist() {
  const [showAddWishlist, setShowAddWishlist] = useState(false);
  const { toast } = useToast();

  const { data: wishlistItems = [], isLoading } = useQuery<WishlistItem[]>({
    queryKey: ["/api/wishlist"],
  });

  const deleteWishlistMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/wishlist/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Success",
        description: "Wishlist item deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete wishlist item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const promoteWishlistMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest("POST", `/api/wishlist/${itemId}/promote`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Wishlist item promoted to project successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to promote wishlist item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteWishlistItem = (itemId: string, itemTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${itemTitle}"?`)) {
      deleteWishlistMutation.mutate(itemId);
    }
  };

  const handlePromoteToProject = (itemId: string, itemTitle: string) => {
    if (window.confirm(`Promote "${itemTitle}" to a project?`)) {
      promoteWishlistMutation.mutate(itemId);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "development": return "bg-green-100 text-green-800";
      case "design": return "bg-blue-100 text-blue-800";
      case "marketing": return "bg-purple-100 text-purple-800";
      case "research": return "bg-orange-100 text-orange-800";
      case "ai-ml": return "bg-indigo-100 text-indigo-800";
      case "e-commerce": return "bg-yellow-100 text-yellow-800";
      case "sustainability": return "bg-emerald-100 text-emerald-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "development": return "💻";
      case "design": return "🎨";
      case "marketing": return "📈";
      case "research": return "🔬";
      case "ai-ml": return "🤖";
      case "e-commerce": return "🛒";
      case "sustainability": return "🌱";
      default: return "💡";
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 lg:pt-6" data-testid="page-wishlist">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Wishlist</h2>
          <p className="text-gray-600">Ideas for future projects and features</p>
        </div>
        <Button
          onClick={() => setShowAddWishlist(true)}
          className="bg-rose-500 text-white hover:bg-rose-600"
          data-testid="button-add-idea"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Idea
        </Button>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ideas yet</h3>
          <p className="text-gray-500 mb-6">Start collecting ideas for future projects</p>
          <Button
            onClick={() => setShowAddWishlist(true)}
            className="bg-rose-500 text-white hover:bg-rose-600"
            data-testid="button-add-first-idea"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Idea
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {wishlistItems.map((item) => (
            <Card
              key={item.id}
              className="hover:shadow-md transition-shadow group"
              data-testid={`wishlist-item-${item.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-lg">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-primary-blue"
                      onClick={() => handlePromoteToProject(item.id, item.title)}
                      disabled={promoteWishlistMutation.isPending}
                      data-testid={`button-promote-${item.id}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => handleDeleteWishlistItem(item.id, item.title)}
                      disabled={deleteWishlistMutation.isPending}
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-item-title-${item.id}`}>
                    {item.title}
                  </h3>
                  <AdminCreatedBadge 
                    createdByAdminUsername={(item as any).created_by_admin_username}
                  />
                </div>
                
                <p className="text-sm text-gray-600 mb-4" data-testid={`text-item-description-${item.id}`}>
                  {item.description}
                </p>
                
                <div className="flex items-center space-x-4">
                  <Badge className={getCategoryColor(item.category)} data-testid={`badge-category-${item.id}`}>
                    {item.category}
                  </Badge>
                  <span className="text-xs text-gray-500" data-testid={`text-created-date-${item.id}`}>
                    Added {formatDate(item.createdAt!)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddWishlistModal 
        open={showAddWishlist} 
        onOpenChange={setShowAddWishlist} 
      />
    </div>
  );
}

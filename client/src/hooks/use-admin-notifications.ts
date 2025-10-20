import { useToast } from "@/hooks/use-toast";

export function useAdminNotifications() {
  const { toast } = useToast();

  const showAdminCreationNotification = (response: any, itemType: string) => {
    if (response._adminCreated) {
      toast({
        title: `${itemType} created by Admin`,
        description: `${response._adminUsername} created this ${itemType.toLowerCase()} for ${response._targetUsername}`,
        variant: "default",
      });
    }
  };

  const interceptResponse = async (response: Response, itemType: string) => {
    if (response.ok) {
      const data = await response.json();
      showAdminCreationNotification(data, itemType);
      return data;
    }
    throw new Error(`Failed to create ${itemType.toLowerCase()}`);
  };

  return {
    showAdminCreationNotification,
    interceptResponse,
  };
}

import { useState, useMemo } from "react";
import { Loader2, CheckCircle, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExtractionJob, useConfirmExtraction } from "@/hooks/api";

interface ExtractionPreviewProps {
  jobId: string;
  restaurantId: string;
  restaurantSlug: string; // Add slug for cache invalidation
  onConfirmed: () => void;
  onCancel: () => void;
}

interface ExtractedItem {
  id: string;
  name: string;
  price: number;
  description: string;
  dietaryType: string;
  confidence: number;
  categoryName: string;
}

export function ExtractionPreview({ 
  jobId, 
  restaurantId, 
  restaurantSlug,
  onConfirmed, 
  onCancel 
}: ExtractionPreviewProps) {
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasTransformed, setHasTransformed] = useState(false);

  // Use React Query hook for job polling
  const { data: job, isLoading } = useExtractionJob(restaurantId, jobId);

  // Use React Query mutation for confirmation
  const confirmMutation = useConfirmExtraction(restaurantId, jobId, restaurantSlug);

  // Transform extracted data into editable items (only once when completed)
  useMemo(() => {
    if (job?.status === 'COMPLETED' && !hasTransformed && job.extracted_data?.categories) {
      const extractedItems: ExtractedItem[] = [];
      
      job.extracted_data.categories.forEach((cat) => {
        cat.items?.forEach((item, idx) => {
          extractedItems.push({
            id: `${cat.name}-${idx}`,
            name: item.name || "Unnamed Item",
            price: item.price || 0,
            description: item.description || `Delicious ${item.name}`,
            dietaryType: item.dietaryType || "Veg",
            confidence: item.confidence || 0.5,
            categoryName: cat.name,
          });
        });
      });
      
      setItems(extractedItems);
      setHasTransformed(true);
    }
  }, [job, hasTransformed]);

  const handleConfirm = async () => {
    // Validate all items have required fields
    const invalidItems = items.filter(item => 
      !item.name || 
      !item.description || 
      !item.dietaryType ||
      item.price <= 0
    );

    if (invalidItems.length > 0) {
      return; // Mutation onError will handle the toast
    }

    // Format items with all required fields
    const formattedItems = items.map(item => ({
      categoryName: item.categoryName,
      name: item.name,
      price: item.price,
      description: item.description,
      dietaryType: item.dietaryType as 'Veg' | 'Non-Veg',
    }));

    // Use the mutation
    await confirmMutation.mutateAsync({ items: formattedItems });
    
    // Close dialog after successful confirmation
    onConfirmed();
  };

  const updateItem = (id: string, field: keyof ExtractedItem, value: string | number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Loading state
  if (isLoading || job?.status === 'PROCESSING' || !job) {
    return (
      <Dialog open onOpenChange={onCancel}>
        <DialogContent className="max-w-md">
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="font-semibold text-lg mb-1">AI Reading Your Menu...</h3>
              <p className="text-sm text-muted-foreground">
                This usually takes 10-30 seconds
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Failed state
  if (job.status === 'FAILED') {
    return (
      <Dialog open onOpenChange={onCancel}>
        <DialogContent className="max-w-md">
          <div className="py-12 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <div>
              <h3 className="font-semibold text-lg mb-1">Extraction Failed</h3>
              <p className="text-sm text-muted-foreground">
                {job.error_message || "Try with a clearer image"}
              </p>
            </div>
            <Button onClick={onCancel}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const groupedByCategory = items.reduce<Record<string, ExtractedItem[]>>((acc, item) => {
    if (!acc[item.categoryName]) acc[item.categoryName] = [];
    acc[item.categoryName].push(item);
    return acc;
  }, {});

  const avgConfidence = items.length > 0
    ? Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length * 100)
    : 0;

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Review Extracted Items ({items.length})</DialogTitle>
            <Badge variant={avgConfidence > 80 ? "default" : "secondary"}>
              {avgConfidence}% Confidence
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Review and edit before adding to menu. All fields are required.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {Object.entries(groupedByCategory).map(([categoryName, categoryItems]) => (
              <div key={categoryName} className="space-y-3">
                <div className="flex items-center gap-2 sticky top-0 bg-background pb-2 border-b">
                  <h4 className="font-semibold">{categoryName}</h4>
                  <Badge variant="outline">{categoryItems.length}</Badge>
                </div>

                {categoryItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <div className="flex-1 space-y-2">
                      {editingId === item.id ? (
                        <>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            placeholder="Item name *"
                            className="font-medium"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value))}
                            placeholder="Price *"
                            className="w-32"
                          />
                          <Textarea
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Description *"
                            rows={2}
                          />
                          <Select
                            value={item.dietaryType}
                            onValueChange={(value) => updateItem(item.id, 'dietaryType', value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Dietary Type *" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Veg">Veg</SelectItem>
                              <SelectItem value="Non-Veg">Non-Veg</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            <Badge 
                              variant="outline"
                              className={
                                item.dietaryType === 'Veg' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {item.dietaryType}
                            </Badge>
                            {item.confidence < 0.7 && (
                              <Badge variant="secondary" className="text-xs">
                                Low Confidence
                              </Badge>
                            )}
                          </div>
                          <p className="font-mono font-semibold">
                            {job.extracted_data?.currency || '₹'}{item.price.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 inline mr-1" />
            {items.length} items ready
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={confirmMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={confirmMutation.isPending || items.length === 0}
            >
              {confirmMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add {items.length} Items
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
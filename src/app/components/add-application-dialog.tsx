import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { JobApplication } from "./job-application-card";

interface AddApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (application: Omit<JobApplication, "id">) => void;
  editingApplication?: JobApplication | null;
}

export function AddApplicationDialog({
  open,
  onOpenChange,
  onSave,
  editingApplication,
}: AddApplicationDialogProps) {
  const [formData, setFormData] = useState<Omit<JobApplication, "id">>({
    company: editingApplication?.company || "",
    position: editingApplication?.position || "",
    status: editingApplication?.status || "applied",
    location: editingApplication?.location || "",
    appliedDate: editingApplication?.appliedDate || new Date().toISOString().split("T")[0],
    notes: editingApplication?.notes || "",
  });

  useEffect(() => {
    if (editingApplication) {
      setFormData({
        company: editingApplication.company,
        position: editingApplication.position,
        status: editingApplication.status,
        location: editingApplication.location,
        appliedDate: editingApplication.appliedDate,
        notes: editingApplication.notes || "",
      });
    } else {
      setFormData({
        company: "",
        position: "",
        status: "applied",
        location: "",
        appliedDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [editingApplication]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({
      company: "",
      position: "",
      status: "applied",
      location: "",
      appliedDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50">
        <DialogHeader>
          <DialogTitle className="text-blue-700">
            {editingApplication ? "Update Status ✏️" : "Add New Application ✨"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {!editingApplication && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-blue-700">Company Name</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    className="border-2 border-blue-200 focus:border-blue-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-blue-700">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className="border-2 border-blue-200 focus:border-blue-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-blue-700">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="border-2 border-blue-200 focus:border-blue-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appliedDate" className="text-blue-700">Applied Date</Label>
                  <Input
                    id="appliedDate"
                    type="date"
                    value={formData.appliedDate}
                    onChange={(e) =>
                      setFormData({ ...formData, appliedDate: e.target.value })
                    }
                    className="border-2 border-blue-200 focus:border-blue-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-blue-700">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="border-2 border-blue-200 focus:border-blue-400"
                    rows={3}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-blue-700">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as JobApplication["status"],
                  })
                }
              >
                <SelectTrigger className="border-2 border-blue-200 focus:border-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-2 border-blue-200">
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50">
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg">
              {editingApplication ? "Update" : "Add"} Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
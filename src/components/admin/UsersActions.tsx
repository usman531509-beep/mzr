"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserDialog, type EditableUser } from "@/components/admin/UserDialog";

export function NewUserButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> New user
      </Button>
      {open && (
        <UserDialog open={open} onOpenChange={setOpen} user={null} />
      )}
    </>
  );
}

export function EditUserButton({
  user, isSelf,
}: {
  user: EditableUser;
  isSelf?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
      {open && (
        <UserDialog open={open} onOpenChange={setOpen} user={user} isSelf={isSelf} />
      )}
    </>
  );
}

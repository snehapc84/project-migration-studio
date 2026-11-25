import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { studentUnreadQuery } from "@/lib/messages";
import { ChatThread } from "./ChatThread";

export function MessageLecturerButton({
  lecturerId,
  lecturerName,
  studentId,
}: {
  lecturerId: string;
  lecturerName: string;
  studentId: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: unread } = useQuery(studentUnreadQuery(studentId));
  const count = unread?.[lecturerId] ?? 0;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="relative mt-4">
        <MessageCircle /> Message Lecturer
        {count > 0 && (
          <span className="ml-1 rounded-full bg-absent px-2 py-0.5 text-[11px] font-bold text-white" aria-label={`${count} unread`}>
            {count} new
          </span>
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-xl text-navy">{lecturerName}</SheetTitle>
            <SheetDescription>Private conversation — only you and this lecturer can see it.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 px-4 pb-4">
            {open && <ChatThread lecturerId={lecturerId} studentId={studentId} viewer="student" otherName={lecturerName} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

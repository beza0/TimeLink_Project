import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ImageWithFallback } from "../common/ImageWithFallback";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "../ui/modal";
import { Calendar, Clock, Video, MapPin } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatTemplate } from "../../language";

interface UpcomingSessionProps {
  id: string;
  title: string;
  instructor: {
    name: string;
    image: string;
  };
  date: string;
  time: string;
  duration: string;
  location: string;
  type: "online" | "in-person";
}

export function UpcomingSession({
  title,
  instructor,
  date,
  time,
  duration,
  location,
  type,
}: UpcomingSessionProps) {
  const { t } = useLanguage();
  const u = t.upcomingSession;
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleJoinSession = () => {
    setJoinDialogOpen(false);
    console.log("Joining session:", title);
  };

  const handleCancelSession = () => {
    setCancelDialogOpen(false);
    console.log("Cancelling session:", title);
  };

  const joinDesc = formatTemplate(u.joinDescription, {
    title,
    name: instructor.name,
    date,
    time,
    duration,
    location,
  });

  const cancelDesc = formatTemplate(u.cancelDescription, {
    name: instructor.name,
  });

  return (
    <Card className="rounded-xl border border-border p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <ImageWithFallback
          src={instructor.image}
          alt={instructor.name}
          className="w-14 h-14 rounded-full object-cover"
        />

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="mb-1 text-foreground">{title}</h4>
              <p className="text-sm text-muted-foreground">
                {u.with} {instructor.name}
              </p>
            </div>
            <Badge variant={type === "online" ? "default" : "secondary"}>
              {type === "online" ? u.online : u.inPerson}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {time} ({duration})
              </span>
            </div>
            <div className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
              {type === "online" ? (
                <Video className="w-3 h-3" />
              ) : (
                <MapPin className="w-3 h-3" />
              )}
              <span>{location}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              onClick={() => setJoinDialogOpen(true)}
            >
              {u.joinSession}
            </Button>

            <Modal open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <ModalContent>
                <ModalHeader>
                  <ModalTitle>{u.joinTitle}</ModalTitle>
                  <ModalDescription>
                    <span className="whitespace-pre-line block">{joinDesc}</span>
                  </ModalDescription>
                </ModalHeader>
                <ModalFooter>
                  <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
                    {u.notYet}
                  </Button>
                  <Button
                    onClick={handleJoinSession}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  >
                    {u.joinNow}
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>

            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setCancelDialogOpen(true)}
            >
              {u.cancel}
            </Button>

            <Modal open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <ModalContent>
                <ModalHeader>
                  <ModalTitle>{u.cancelTitle}</ModalTitle>
                  <ModalDescription>
                    <span className="whitespace-pre-line block">{cancelDesc}</span>
                  </ModalDescription>
                </ModalHeader>
                <ModalFooter>
                  <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                    {u.keepSession}
                  </Button>
                  <Button
                    onClick={handleCancelSession}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {u.yesCancel}
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
        </div>
      </div>
    </Card>
  );
}

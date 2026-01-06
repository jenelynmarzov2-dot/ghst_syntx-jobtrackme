import { useState } from "react";
import { Calendar } from "./ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { JobApplication } from "./job-application-card";

interface ApplicationCalendarProps {
  applications: JobApplication[];
}

export function ApplicationCalendar({ applications }: ApplicationCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get applications for the selected date
  const getApplicationsForDate = (date: Date | undefined) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return applications.filter((app) => app.appliedDate === dateStr);
  };

  // Get all dates with applications
  const getDatesWithApplications = () => {
    return applications.map((app) => new Date(app.appliedDate));
  };

  const selectedDateApplications = getApplicationsForDate(selectedDate);
  const datesWithApplications = getDatesWithApplications();

  return (
    <Card className="shadow-lg border-2 border-blue-100">
      <CardHeader>
        <CardTitle className="text-blue-600 text-center">Application Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="w-full flex justify-center items-center">
            <div className="scale-125 my-8">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-lg border-2 border-blue-200 shadow-md"
                modifiers={{
                  hasApplication: datesWithApplications,
                }}
                modifiersClassNames={{
                  hasApplication: "bg-blue-200 font-semibold text-blue-800",
                }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-600">
                Applications on {selectedDate?.toLocaleDateString() || "Select a date"}
              </h3>
              {selectedDateApplications.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-blue-700">Position</TableHead>
                      <TableHead className="text-blue-700">Company</TableHead>
                      <TableHead className="text-blue-700">Location</TableHead>
                      <TableHead className="text-blue-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDateApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium text-blue-800">{app.position}</TableCell>
                        <TableCell className="text-blue-600">{app.company}</TableCell>
                        <TableCell className="text-blue-600">{app.location}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-200 text-blue-800 border-blue-300">
                            {app.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-blue-400 text-sm">
                  No applications
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
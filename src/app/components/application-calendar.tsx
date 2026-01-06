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

const statusColors = {
  applied: "bg-blue-100 text-blue-700 border border-blue-200",
  interview: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  offer: "bg-green-100 text-green-700 border border-green-200",
  rejected: "bg-red-100 text-red-700 border border-red-200",
};

interface ApplicationCalendarProps {
  applications: JobApplication[];
}

export function ApplicationCalendar({ applications }: ApplicationCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get applications for the selected date
  const getApplicationsForDate = (date: Date | undefined) => {
    if (!date) return [];
    const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-blue-200">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-blue-200 px-4 py-2 text-left text-blue-700">Position</th>
                        <th className="border border-blue-200 px-4 py-2 text-left text-blue-700">Company</th>
                        <th className="border border-blue-200 px-4 py-2 text-left text-blue-700">Location</th>
                        <th className="border border-blue-200 px-4 py-2 text-left text-blue-700">Status</th>
                        <th className="border border-blue-200 px-4 py-2 text-left text-blue-700">Applied Date</th>
                        <th className="border border-blue-200 px-4 py-2 text-left text-blue-700">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDateApplications.map((app) => (
                        <tr key={app.id} className="hover:bg-blue-50">
                          <td className="border border-blue-200 px-4 py-2 font-medium text-blue-800">{app.position}</td>
                          <td className="border border-blue-200 px-4 py-2 text-blue-600">{app.company}</td>
                          <td className="border border-blue-200 px-4 py-2 text-blue-600">{app.location}</td>
                          <td className="border border-blue-200 px-4 py-2">
                            <Badge className={statusColors[app.status]}>
                              {app.status}
                            </Badge>
                          </td>
                          <td className="border border-blue-200 px-4 py-2 text-blue-600">{app.appliedDate}</td>
                          <td className="border border-blue-200 px-4 py-2 text-blue-600">{app.notes || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
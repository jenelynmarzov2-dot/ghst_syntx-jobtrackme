import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { JobApplicationCard, JobApplication } from "./components/job-application-card";
import { AddApplicationDialog } from "./components/add-application-dialog";
import { ProfileDialog, PersonalInfo } from "./components/profile-dialog";
import { ApplicationCalendar } from "./components/application-calendar";
import { LoginDialog } from "./components/login-dialog";
import { Plus, Home, User, Calendar, LogOut } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

interface UserData {
  personalInfo: PersonalInfo;
  applications: JobApplication[];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("home");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: " ",
    email: " ",
    phone: " ",
    location: " ",
    title: " ",
    imageUrl: "",
    country: "",
    city: "",
    municipality: "",
    barangay: "",
  });

  const [applications, setApplications] = useState<JobApplication[]>([]);

  // Check for existing session on mount and listen for auth state changes
  useEffect(() => {
    checkSession();

    // Listen for auth state changes (important for OAuth redirects)
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          handleLogin(session.user.email || '', session.access_token);
        } else if (event === 'SIGNED_OUT') {
          handleLogout();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    const savedUser = localStorage.getItem("currentUser");
    const savedToken = localStorage.getItem("accessToken");
    
    if (savedUser && savedToken) {
      setCurrentUser(savedUser);
      setAccessToken(savedToken);
      loadUserData(savedUser);
    }
  };

  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      saveUserData(currentUser);
    }
  }, [personalInfo, applications, currentUser]);

  const loadUserData = (userEmail: string) => {
    const userDataKey = `userData_${userEmail}`;
    const savedData = localStorage.getItem(userDataKey);
    
    if (savedData) {
      const userData: UserData = JSON.parse(savedData);
      setPersonalInfo(userData.personalInfo);
      setApplications(userData.applications);
    } else {
      // New user - set default empty state
      setPersonalInfo({
        name: userEmail.split("@")[0] || "User",
        email: userEmail,
        phone: "",
        location: "",
        title: "Job Seeker",
        imageUrl: "",
      });
      setApplications([]);
    }
  };

  const saveUserData = (userEmail: string) => {
    const userDataKey = `userData_${userEmail}`;
    const userData: UserData = {
      personalInfo,
      applications,
    };
    localStorage.setItem(userDataKey, JSON.stringify(userData));
  };

  const sendEmailNotification = async (type: 'added' | 'updated' | 'deleted', application: JobApplication) => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-63111a90/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ type, application }),
        }
      );

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('Email notification sent successfully');
      } else {
        console.log('Email notification not sent:', result.message || result.error);
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  };

  const handleLogin = (email: string, token: string) => {
    setCurrentUser(email);
    setAccessToken(token);
    localStorage.setItem("currentUser", email);
    localStorage.setItem("accessToken", token);
    loadUserData(email);
  };

  const handleLogout = async () => {
    // Sign out from Supabase
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }

    setCurrentUser(null);
    setAccessToken(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    setApplications([]);
    setPersonalInfo({
      name: "John Doe",
      email: "john.doe@email.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
      title: "Software Engineer",
      imageUrl: "",
      country: "",
      city: "",
      municipality: "",
      barangay: "",
    });
    setActiveTab("home");
  };

  const handleSaveApplication = (applicationData: Omit<JobApplication, "id">) => {
    if (editingApplication) {
      const updatedApp = { ...applicationData, id: editingApplication.id };
      setApplications(
        applications.map((app) =>
          app.id === editingApplication.id ? updatedApp : app
        )
      );
      sendEmailNotification('updated', updatedApp);
      setEditingApplication(null);
    } else {
      const newApplication: JobApplication = {
        ...applicationData,
        id: Date.now().toString(),
      };
      setApplications([newApplication, ...applications]);
      sendEmailNotification('added', newApplication);
    }
    setShowAddDialog(false);
  };

  const handleEditApplication = (application: JobApplication) => {
    setEditingApplication(application);
    setShowAddDialog(true);
  };

  const handleDeleteApplication = (id: string) => {
    const appToDelete = applications.find(app => app.id === id);
    setApplications(applications.filter((app) => app.id !== id));
    if (appToDelete) {
      sendEmailNotification('deleted', appToDelete);
    }
  };

  const handleSavePersonalInfo = (info: PersonalInfo) => {
    setPersonalInfo(info);
  };

  const getStatusCount = (status: JobApplication["status"]) => {
    return applications.filter((app) => app.status === status).length;
  };

  // Show login dialog if not logged in
  if (!currentUser) {
    return <LoginDialog open={true} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b-2 border-pink-200 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-pink-400 to-pink-600 p-2 rounded-full shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Job Application Tracker ✨
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("home")}
                className="gap-2 border-2 border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700 shadow-sm"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2 border-2 border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700 shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-white/80 backdrop-blur-sm border-2 border-pink-200 shadow-lg">
            <TabsTrigger value="home" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-400 data-[state=active]:to-pink-600 data-[state=active]:text-white">
              <Home className="w-4 h-4 mr-2" />
              Home
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-400 data-[state=active]:to-pink-600 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-400 data-[state=active]:to-pink-600 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home" className="space-y-6">
            {/* Profile Card */}
            <Card className="shadow-xl border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-16 h-16 border-4 border-pink-300 shadow-lg">
                        <AvatarImage src={personalInfo.imageUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-300 to-pink-500 text-white">
                          {personalInfo.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1">
                        <span className="text-white text-xs">✨</span>
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-pink-700">{personalInfo.name}</CardTitle>
                      <CardDescription className="text-pink-600">{personalInfo.title}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowProfileDialog(true)}
                    className="border-2 border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700 shadow-sm"
                  >
                    Edit Profile
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="shadow-lg border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-white hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <CardDescription className="text-pink-600">Total Applications</CardDescription>
                  <CardTitle className="text-3xl text-pink-700">{applications.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <CardDescription className="text-blue-600">Applied</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">
                    {getStatusCount("applied")}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-lg border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <CardDescription className="text-yellow-600">Interviews</CardDescription>
                  <CardTitle className="text-3xl text-yellow-600">
                    {getStatusCount("interview")}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-white hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <CardDescription className="text-green-600">Offers</CardDescription>
                  <CardTitle className="text-3xl text-green-600">
                    {getStatusCount("offer")}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Applications List */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-pink-700">My Applications 💼</h2>
              <Button onClick={() => {
                setEditingApplication(null);
                setShowAddDialog(true);
              }} className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Application
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applications.map((application) => (
                <JobApplicationCard
                  key={application.id}
                  application={application}
                  onEdit={handleEditApplication}
                  onDelete={handleDeleteApplication}
                />
              ))}
            </div>

            {applications.length === 0 && (
              <Card className="p-12 shadow-lg border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50">
                <div className="text-center space-y-2">
                  <p className="text-pink-500">No applications yet 🌸</p>
                  <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Application
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <ApplicationCalendar applications={applications} />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-xl border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50">
              <CardHeader>
                <CardTitle className="text-pink-700">Personal Information 💕</CardTitle>
                <CardDescription className="text-pink-600">
                  Manage your personal details and profile picture
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-pink-300 shadow-lg">
                      <AvatarImage src={personalInfo.imageUrl} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-pink-300 to-pink-500 text-white">
                        {personalInfo.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-pink-500 rounded-full p-2">
                      <span className="text-white">✨</span>
                    </div>
                  </div>
                  <Button onClick={() => setShowProfileDialog(true)} className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg">
                    Edit Profile
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-100">
                      <p className="text-sm text-pink-600">Full Name</p>
                      <p className="font-medium text-pink-800">{personalInfo.name}</p>
                    </div>
                    <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-100">
                      <p className="text-sm text-pink-600">Professional Title</p>
                      <p className="font-medium text-pink-800">{personalInfo.title}</p>
                    </div>
                    <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-100">
                      <p className="text-sm text-pink-600">Email</p>
                      <p className="font-medium text-pink-800">{personalInfo.email}</p>
                    </div>
                    <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-100">
                      <p className="text-sm text-pink-600">Phone</p>
                      <p className="font-medium text-pink-800">{personalInfo.phone}</p>
                    </div>
                    <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-100">
                      <p className="text-sm text-pink-600">Location</p>
                      <p className="font-medium text-pink-800">{personalInfo.location}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Summary */}
            <Card className="shadow-xl border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50">
              <CardHeader>
                <CardTitle className="text-pink-700">Application Summary 📊</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg border-2 border-pink-100">
                    <span className="text-pink-700">Total Applications</span>
                    <span className="font-semibold text-pink-800">{applications.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-100">
                    <span className="text-blue-700">Applied</span>
                    <span className="font-semibold text-blue-600">
                      {getStatusCount("applied")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-100">
                    <span className="text-yellow-700">Interviews</span>
                    <span className="font-semibold text-yellow-600">
                      {getStatusCount("interview")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-100">
                    <span className="text-green-700">Offers</span>
                    <span className="font-semibold text-green-600">
                      {getStatusCount("offer")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-2 border-red-100">
                    <span className="text-red-700">Rejected</span>
                    <span className="font-semibold text-red-600">
                      {getStatusCount("rejected")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <AddApplicationDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingApplication(null);
        }}
        onSave={handleSaveApplication}
        editingApplication={editingApplication}
      />

      <ProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        personalInfo={personalInfo}
        onSave={handleSavePersonalInfo}
      />
    </div>
  );
}
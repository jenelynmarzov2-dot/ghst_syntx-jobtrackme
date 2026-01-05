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
  });

  const [applications, setApplications] = useState<JobApplication[]>([]);

  // Note: Removed localStorage clearing on startup to allow OAuth redirects to work properly
  // User data is kept for returning users who log in again

  // Separate effect for auth state changes
  useEffect(() => {
    let subscription: any = null;
    let isHandlingAuth = false; // Prevent concurrent auth handling

    const setupAuth = async () => {
      try {
        console.log('Setting up auth listener...');
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          `https://${projectId}.supabase.co`,
          publicAnonKey
        );

        // Handle OAuth redirects (like Google sign-in)
        const { data } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            // Prevent concurrent auth handling
            if (isHandlingAuth) {
              console.log('Auth handling already in progress, skipping');
              return;
            }

            isHandlingAuth = true;

            try {
              console.log('Auth state change:', event, 'Session exists:', !!session);

              if (event === 'SIGNED_IN' && session && session.user) {
                console.log('User signed in:', session.user.email);

                // Prevent duplicate logins
                if (!currentUser) {
                  console.log('Logging in user:', session.user.email);
                  handleLogin(session.user.email || '', session.access_token);

                  // Clean up URL parameters after a longer delay to ensure login completes
                  setTimeout(() => {
                    try {
                      console.log('Cleaning up URL parameters');
                      // Use replaceState instead of pushState to avoid navigation issues
                      window.history.replaceState({}, document.title, window.location.pathname);
                    } catch (error) {
                      console.error('Error cleaning up URL:', error);
                    }
                  }, 2000); // Increased delay for OAuth stability
                } else {
                  console.log('User already logged in, skipping duplicate login');
                }
              } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                handleLogout();
              } else if (event === 'TOKEN_REFRESHED') {
                console.log('Token refreshed successfully');
              }
            } catch (error) {
              console.error('Error in auth state change handler:', error);
              // Don't crash the app on auth errors
            } finally {
              isHandlingAuth = false;
            }
          }
        );

        subscription = data.subscription;
        console.log('Auth listener setup complete');
      } catch (error) {
        console.error('Failed to setup auth listener:', error);
        // Don't crash the app if auth setup fails
      }
    };

    setupAuth();

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
          console.log('Auth subscription cleaned up');
        } catch (error) {
          console.error('Error cleaning up auth subscription:', error);
        }
      }
    };
  }, [currentUser]); // Add currentUser to dependencies to prevent stale closure issues

  // Removed checkSession function - no auto-login from localStorage

  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      saveUserData(currentUser);
    }
  }, [personalInfo, applications, currentUser]);

  const loadUserData = (userEmail: string) => {
    try {
      const userDataKey = `userData_${userEmail}`;
      const savedData = localStorage.getItem(userDataKey);

      if (savedData) {
        try {
          const userData: UserData = JSON.parse(savedData);
          setPersonalInfo(userData.personalInfo);
          setApplications(userData.applications);
        } catch (parseError) {
          console.error('Error parsing user data from localStorage:', parseError);
          // Clear corrupted data and set defaults
          localStorage.removeItem(userDataKey);
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
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set defaults if localStorage access fails
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
    return <LoginDialog key={`login-dialog-${Date.now()}`} open={true} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-full shadow-sm">
                <Calendar className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Job Application Tracker
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("home")}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
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
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="home">
              <Home className="w-4 h-4 mr-2" />
              Home
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="profile">
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
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Applications</CardDescription>
                  <CardTitle className="text-3xl">{applications.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Applied</CardDescription>
                  <CardTitle className="text-3xl">
                    {getStatusCount("applied")}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Interviews</CardDescription>
                  <CardTitle className="text-3xl">
                    {getStatusCount("interview")}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Offers</CardDescription>
                  <CardTitle className="text-3xl">
                    {getStatusCount("offer")}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Applications List */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Applications</h2>
              <Button onClick={() => {
                setEditingApplication(null);
                setShowAddDialog(true);
              }}>
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
              <Card className="p-12">
                <div className="text-center space-y-2">
                  <p>No applications yet</p>
                  <Button onClick={() => setShowAddDialog(true)}>
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
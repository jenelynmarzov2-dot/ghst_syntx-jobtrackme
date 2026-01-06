import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { JobApplicationCard, JobApplication } from "./components/job-application-card";
import { AddApplicationDialog } from "./components/add-application-dialog";
import { ProfileDialog, PersonalInfo } from "./components/profile-dialog";
import { ApplicationCalendar } from "./components/application-calendar";
import { LoginDialog } from "./components/login-dialog";
import { Plus, Home, User, Calendar, LogOut } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { Toaster, toast } from "sonner";

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
  const [isNewUser, setIsNewUser] = useState<boolean>(true);

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

  const handleLogin = (email: string, token: string) => {
    setCurrentUser(email);
    setAccessToken(token);
    localStorage.setItem("currentUser", email);
    localStorage.setItem("accessToken", token);

    // Check if this is the user's first login
    const firstLoginKey = `firstLogin_${email}`;
    const firstLoginDate = localStorage.getItem(firstLoginKey);

    if (!firstLoginDate) {
      // First time login - set today's date and mark as new user
      const today = new Date().toDateString();
      localStorage.setItem(firstLoginKey, today);
      setIsNewUser(true);
    } else {
      // Returning user - they've logged in before
      setIsNewUser(false);
    }

    loadUserData(email);
  };

  // Test toast on mount
  useEffect(() => {
    console.log('App mounted, testing toast');
    toast.success("App loaded successfully!");
  }, []);

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

        // Check for existing session on app load
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session && sessionData.session.user && !currentUser) {
          console.log('Existing session found, logging in user:', sessionData.session.user.email);
          handleLogin(sessionData.session.user.email || '', sessionData.session.access_token);
        }

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
                  toast.success("Welcome back!");

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
                console.log('User signed out (external event)');
                // Only handle external sign-out events, not our own signOut() calls
                if (currentUser) {
                  handleLogout();
                }
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

  const handleLogout = async () => {
    // Prevent multiple logout calls
    if (!currentUser) return;

    console.log('Logging out user...');

    // Clear local state first to prevent loops
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

    // Sign out from Supabase (this will trigger the auth state change, but we already cleared state)
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      await supabase.auth.signOut();
      console.log('Successfully signed out from Supabase');
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSaveApplication = (applicationData: Omit<JobApplication, "id">) => {
    console.log('handleSaveApplication called with:', applicationData);
    if (editingApplication) {
      const updatedApp = { ...applicationData, id: editingApplication.id };
      setApplications(
        applications.map((app) =>
          app.id === editingApplication.id ? updatedApp : app
        )
      );
      sendEmailNotification('updated', updatedApp);
      console.log('Showing update toast');
      toast.success("Application updated successfully!");
      setEditingApplication(null);
    } else {
      const newApplication: JobApplication = {
        ...applicationData,
        id: Date.now().toString(),
      };
      setApplications([newApplication, ...applications]);
      sendEmailNotification('added', newApplication);
      console.log('Showing add toast');
      toast.success("Application added successfully!");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-emerald-400 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-purple-400 rounded-full blur-xl"></div>
        <div className="absolute bottom-40 right-10 w-28 h-28 bg-orange-400 rounded-full blur-xl"></div>
      </div>

      {/* Show login dialog if not logged in */}
      {(!currentUser) && (
        <LoginDialog key={`login-dialog-${Date.now()}`} open={true} onLogin={handleLogin} />
      )}

      {/* Main app content when logged in */}
      {currentUser && (
        <div>
          {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 via-blue-900 to-indigo-900 backdrop-blur-sm border-b sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-800 p-2 rounded-full shadow-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Job Tracker
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("home")}
                className="gap-2 border-black text-black hover:bg-white hover:text-blue-800"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2 border-black text-black hover:bg-white hover:text-blue-800"
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
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex justify-center gap-4" style={{ zIndex: 50, position: 'relative' }}>
            <button
              onClick={() => {
                console.log("Home button clicked");
                setActiveTab("home");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: activeTab === "home" ? "#3b82f6" : "transparent",
                border: "1px solid #3b82f6",
                color: activeTab === "home" ? "white" : "#3b82f6",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => {
                console.log("Calendar button clicked");
                setActiveTab("calendar");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: activeTab === "calendar" ? "#3b82f6" : "transparent",
                border: "1px solid #3b82f6",
                color: activeTab === "calendar" ? "white" : "#3b82f6",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
</div>
          {/* Home Tab */}
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="text-center py-8 animate-fade-in">
                <h1 className="text-4xl font-bold text-gray-800 mb-2 animate-slide-up">{isNewUser ? "Welcome" : "Welcome back"}, {personalInfo.name.split(" ")[0]}! 👋</h1>
                <p className="text-lg text-gray-600 animate-slide-up animation-delay-200">Let's track your job applications and land your dream job!</p>
                <div className="mt-4 flex justify-center space-x-4 animate-slide-up animation-delay-400">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-pulse-slow">
                    🎯 Focus on Quality
                  </div>
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-pulse-slow animation-delay-100">
                    📈 Track Progress
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-pulse-slow animation-delay-200">
                    🚀 Achieve Goals
                  </div>
                </div>
              </div>

              {/* Profile Card */}
              <Card className="shadow-xl border-2 border-blue-800 bg-gradient-to-br from-white to-gray-50 hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-16 h-16 border-4 border-blue-800 shadow-lg">
                          <AvatarImage src={personalInfo.imageUrl} />
                          <AvatarFallback className="bg-blue-800 text-white">
                            {personalInfo.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1">
                          <span className="text-white text-xs">✨</span>
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-gray-800">{personalInfo.name}</CardTitle>
                        <CardDescription className="text-gray-600">{personalInfo.title}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowProfileDialog(true)}
                      className="border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white shadow-sm"
                    >
                      Edit Profile
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <Card className="border-2 border-blue-800 bg-gradient-to-br from-blue-50 via-white to-blue-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-blue-800 font-semibold">📋 Total Applications</CardDescription>
                    <CardTitle className="text-4xl text-blue-900 font-bold">{applications.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-emerald-700 font-semibold">🚀 Applied</CardDescription>
                    <CardTitle className="text-4xl text-emerald-800 font-bold">
                      {getStatusCount("applied")}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-2 border-orange-500 bg-gradient-to-br from-orange-50 via-white to-orange-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-orange-700 font-semibold">🎯 Interviews</CardDescription>
                    <CardTitle className="text-4xl text-orange-800 font-bold">
                      {getStatusCount("interview")}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-2 border-emerald-500 bg-gradient-to-br from-green-50 via-white to-green-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-green-700 font-semibold">🎉 Offers</CardDescription>
                    <CardTitle className="text-4xl text-green-800 font-bold">
                      {getStatusCount("offer")}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-2 border-red-500 bg-gradient-to-br from-red-50 via-white to-red-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-red-700 font-semibold">❌ Rejected</CardDescription>
                    <CardTitle className="text-4xl text-red-800 font-bold">
                      {getStatusCount("rejected")}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Applications List */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">My Applications</h2>
                <Button onClick={() => {
                  console.log('Add application button clicked');
                  setEditingApplication(null);
                  setShowAddDialog(true);
                }} size="icon" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-2 border-blue-800 z-50 w-12 h-12" title="Add Application">
                  <Plus className="w-6 h-6" />
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
                    </div>
                </Card>
              )}
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === "calendar" && (
            <ApplicationCalendar applications={applications} />
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <Card className="shadow-xl border-2 border-blue-800 bg-gradient-to-br from-white to-gray-50">
                <CardHeader>
                  <CardTitle className="text-gray-800">Personal Information 💼</CardTitle>
                  <CardDescription className="text-gray-600">
                    Manage your personal details and profile picture
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-32 h-32 border-4 border-blue-800 shadow-lg">
                        <AvatarImage src={personalInfo.imageUrl} />
                        <AvatarFallback className="text-2xl bg-blue-800 text-white">
                          {personalInfo.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 bg-orange-500 rounded-full p-2">
                        <span className="text-white">✨</span>
                      </div>
                    </div>
                    <Button onClick={() => setShowProfileDialog(true)} className="bg-blue-800 hover:bg-blue-900 text-white shadow-lg">
                      Edit Profile
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-800">
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-medium text-gray-800">{personalInfo.name}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-800">
                        <p className="text-sm text-gray-600">Professional Title</p>
                        <p className="font-medium text-gray-800">{personalInfo.title}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-800">
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-800">{personalInfo.email}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-800">
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium text-gray-800">{personalInfo.phone}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-800">
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium text-gray-800">{personalInfo.location}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Application Summary */}
              <Card className="shadow-xl border-2 border-blue-800 bg-gradient-to-br from-white to-gray-50">
                <CardHeader>
                  <CardTitle className="text-gray-800">Application Summary 📊</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-blue-800">
                      <span className="text-gray-800">Total Applications</span>
                      <span className="font-semibold text-gray-800">{applications.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-emerald-500">
                      <span className="text-emerald-700">Applied</span>
                      <span className="font-semibold text-emerald-600">
                        {getStatusCount("applied")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-orange-500">
                      <span className="text-orange-700">Interviews</span>
                      <span className="font-semibold text-orange-600">
                        {getStatusCount("interview")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-emerald-500">
                      <span className="text-emerald-700">Offers</span>
                      <span className="font-semibold text-emerald-600">
                        {getStatusCount("offer")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-red-500">
                      <span className="text-red-700">Rejected</span>
                      <span className="font-semibold text-red-600">
                        {getStatusCount("rejected")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
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
      )}

      <Toaster position="top-center" richColors />
    </div>
  );
}

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  Building2,
  User,
  Bell,
  Shield,
  CreditCard,
  Zap,
  Mail,
  AlertTriangle,
  Globe,
  Database,
  Save,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { BackendUser, updateUser } from "../lib/api";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type CompanyFormState = {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
};

interface SettingsProps {
  user: BackendUser;
  authToken?: string;
  onUserUpdated?: (user: BackendUser) => void;
}

export function Settings({ user, authToken, onUserUpdated }: SettingsProps) {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => ({
    firstName: "",
    lastName: "",
    email: user.email ?? "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  }));
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(() => ({
    name: user.company_name ?? "",
    email: user.company_email ?? "",
    phone: user.company_phone ?? "",
    website: user.company_website ?? "",
    address: user.company_address ?? "",
  }));

  const handleSave = () => {
    setSaveSuccess(true);
    toast.success("Settings saved successfully!");
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const effectiveToken = useMemo(() => {
    if (authToken) return authToken;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("aaa_auth_token");
      return stored ?? undefined;
    }
    return undefined;
  }, [authToken]);

  useEffect(() => {
    const parts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
    setProfileForm((prev) => ({
      ...prev,
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      email: user.email ?? prev.email,
    }));
    setCompanyForm({
      name: user.company_name ?? "",
      email: user.company_email ?? "",
      phone: user.company_phone ?? "",
      website: user.company_website ?? "",
      address: user.company_address ?? "",
    });
  }, [user]);

  const handleProfileInputChange = (field: keyof ProfileFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setProfileForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleCompanyInputChange = (field: keyof CompanyFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setCompanyForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleProfileSave = async () => {
    if (!profileForm.firstName.trim()) {
      toast.error("First name is required", {
        description: "Please provide at least a first name before saving.",
      });
      return;
    }

    if (!profileForm.email.trim()) {
      toast.error("Email is required", {
        description: "A valid email address is needed to update your profile.",
      });
      return;
    }

    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      toast.error("Passwords do not match", {
        description: "Make sure the new password and confirmation match.",
      });
      return;
    }

    const payload = {
      name: [profileForm.firstName.trim(), profileForm.lastName.trim()].filter(Boolean).join(" ") || user.name,
      email: profileForm.email.trim(),
      ...(profileForm.newPassword ? { password: profileForm.newPassword } : {}),
    };

    setIsSavingProfile(true);
    try {
      const updatedUser = await updateUser(user.id, payload, effectiveToken);
      onUserUpdated?.(updatedUser);
      setSaveSuccess(true);
      toast.success("Profile updated", {
        description: "Your personal details were saved successfully.",
      });
      setTimeout(() => setSaveSuccess(false), 3000);
      setProfileForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update profile";
      toast.error("Profile update failed", { description: message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCompanySave = async () => {
    if (!companyForm.name.trim()) {
      toast.error("Company name is required", {
        description: "Please provide a company name before saving.",
      });
      return;
    }

    setIsSavingCompany(true);
    try {
      const payload = {
        company_name: companyForm.name.trim(),
        company_email: companyForm.email.trim() || null,
        company_phone: companyForm.phone.trim() || null,
        company_website: companyForm.website.trim() || null,
        company_address: companyForm.address.trim() || null,
      };

      const updatedUser = await updateUser(user.id, payload, effectiveToken);
      onUserUpdated?.(updatedUser);
      setCompanyForm({
        name: updatedUser.company_name ?? "",
        email: updatedUser.company_email ?? "",
        phone: updatedUser.company_phone ?? "",
        website: updatedUser.company_website ?? "",
        address: updatedUser.company_address ?? "",
      });
      setSaveSuccess(true);
      toast.success("Company profile updated", {
        description: "Your company details were saved successfully.",
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update company";
      toast.error("Company update failed", { description: message });
    } finally {
      setIsSavingCompany(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your platform configuration and preferences</p>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-900">Settings saved successfully!</p>
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="w-4 h-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Zap className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-2xl">AJ</span>
                </div>
                <div className="space-y-2">
                  <Button variant="outline">Change Avatar</Button>
                  <p className="text-xs text-slate-500">JPG, GIF or PNG. Max size 2MB.</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={handleProfileInputChange("firstName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={handleProfileInputChange("lastName")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileInputChange("email")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={handleProfileInputChange("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="pst">
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
                    <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
                    <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
                    <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  value={profileForm.currentPassword}
                  onChange={handleProfileInputChange("currentPassword")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={profileForm.newPassword}
                    onChange={handleProfileInputChange("newPassword")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={profileForm.confirmPassword}
                    onChange={handleProfileInputChange("confirmPassword")}
                  />
                </div>
              </div>

              <Button onClick={handleProfileSave} disabled={isSavingProfile}>
                {isSavingProfile ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Settings */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Manage your agency details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyForm.name}
                  onChange={handleCompanyInputChange("name")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyForm.email}
                    onChange={handleCompanyInputChange("email")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Company Phone</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={companyForm.phone}
                    onChange={handleCompanyInputChange("phone")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <Input
                  id="companyWebsite"
                  type="url"
                  value={companyForm.website}
                  onChange={handleCompanyInputChange("website")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAddress">Address</Label>
                <Textarea
                  id="companyAddress"
                  value={companyForm.address}
                  onChange={handleCompanyInputChange("address")}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline">Upload Logo</Button>
                    <p className="text-xs text-slate-500">Recommended size: 400x400px</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Team Settings</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Default Manager Role</Label>
                      <p className="text-xs text-slate-500">New managers will be assigned this role by default</p>
                    </div>
                    <Select defaultValue="manager">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="senior">Senior Ad Manager</SelectItem>
                        <SelectItem value="manager">Ad Manager</SelectItem>
                        <SelectItem value="junior">Junior Ad Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={handleCompanySave} disabled={isSavingCompany}>
                {isSavingCompany ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure which email notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New AI Recommendations</Label>
                    <p className="text-xs text-slate-500">Get notified when new recommendations are generated</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Client Report Ready</Label>
                    <p className="text-xs text-slate-500">Notification when client reports are ready for review</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Performance Alerts</Label>
                    <p className="text-xs text-slate-500">Critical alerts about campaign performance issues</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Manager Activity Updates</Label>
                    <p className="text-xs text-slate-500">Updates when managers approve or reject recommendations</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Performance Summary</Label>
                    <p className="text-xs text-slate-500">Weekly digest of all client performance metrics</p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Updates</Label>
                    <p className="text-xs text-slate-500">Platform updates and new feature announcements</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>Manage notifications within the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Desktop Notifications</Label>
                    <p className="text-xs text-slate-500">Show desktop notifications for critical alerts</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound Alerts</Label>
                    <p className="text-xs text-slate-500">Play sound for important notifications</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Ads Integration</CardTitle>
              <CardDescription>Connect and manage your Google Ads accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">Google Ads API Connected</p>
                    <p className="text-xs text-slate-500">Last synced: 2 minutes ago</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white">Active</Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleAdsAccount">Manager Account ID</Label>
                <Input id="googleAdsAccount" defaultValue="123-456-7890" disabled />
              </div>

              <div className="space-y-2">
                <Label>Connected Client Accounts</Label>
                <div className="text-sm text-slate-900">8 client accounts synced</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="syncFrequency">Data Sync Frequency</Label>
                <Select defaultValue="hourly">
                  <SelectTrigger id="syncFrequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="manual">Manual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
                <Button variant="outline">
                  <Database className="w-4 h-4 mr-2" />
                  Sync Now
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Other Integrations</CardTitle>
              <CardDescription>Connect additional platforms and tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">Email Marketing Platform</p>
                    <p className="text-xs text-slate-500">Connect Mailchimp or SendGrid</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <Globe className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">Analytics Platform</p>
                    <p className="text-xs text-slate-500">Google Analytics integration</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">Slack Notifications</p>
                    <p className="text-xs text-slate-500">Receive alerts in Slack</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Settings */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Alert Thresholds</CardTitle>
              <CardDescription>Configure when alerts are triggered for campaign performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ctrThreshold">Click-Through Rate (CTR) Drop</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      id="ctrThreshold" 
                      type="number" 
                      defaultValue="20" 
                      className="w-32"
                    />
                    <span className="text-sm text-slate-500">% below average</span>
                  </div>
                  <p className="text-xs text-slate-500">Alert when CTR drops below this percentage of the average</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="cpaThreshold">Cost Per Acquisition (CPA) Increase</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      id="cpaThreshold" 
                      type="number" 
                      defaultValue="25" 
                      className="w-32"
                    />
                    <span className="text-sm text-slate-500">% above target</span>
                  </div>
                  <p className="text-xs text-slate-500">Alert when CPA exceeds target by this percentage</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="roasThreshold">Return on Ad Spend (ROAS) Drop</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      id="roasThreshold" 
                      type="number" 
                      defaultValue="30" 
                      className="w-32"
                    />
                    <span className="text-sm text-slate-500">% below target</span>
                  </div>
                  <p className="text-xs text-slate-500">Alert when ROAS falls below target by this percentage</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="budgetThreshold">Budget Utilization</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      id="budgetThreshold" 
                      type="number" 
                      defaultValue="80" 
                      className="w-32"
                    />
                    <span className="text-sm text-slate-500">% of monthly budget</span>
                  </div>
                  <p className="text-xs text-slate-500">Alert when this percentage of budget is spent</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="conversionThreshold">Conversion Rate Drop</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      id="conversionThreshold" 
                      type="number" 
                      defaultValue="15" 
                      className="w-32"
                    />
                    <span className="text-sm text-slate-500">% below average</span>
                  </div>
                  <p className="text-xs text-slate-500">Alert when conversion rate drops below average by this percentage</p>
                </div>
              </div>

              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Thresholds
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alert Recipients</CardTitle>
              <CardDescription>Choose who receives performance alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send to Account Managers</Label>
                    <p className="text-xs text-slate-500">Notify the manager assigned to the affected client</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send to Admin</Label>
                    <p className="text-xs text-slate-500">Always notify platform administrators</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send to Client</Label>
                    <p className="text-xs text-slate-500">Notify clients directly about critical issues</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Recipients
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>Manage your subscription and billing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg text-white">
                <div>
                  <p className="text-sm opacity-90">Current Plan</p>
                  <h3 className="text-white mt-1">Enterprise</h3>
                  <p className="text-sm opacity-90 mt-2">$499/month • Billed annually</p>
                </div>
                <Badge className="bg-white text-blue-600 hover:bg-white">Active</Badge>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">Active Managers</p>
                  <p className="text-slate-900 mt-1">8 / 15</p>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">Client Accounts</p>
                  <p className="text-slate-900 mt-1">25 / 50</p>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">API Calls/Month</p>
                  <p className="text-slate-900 mt-1">45K / 100K</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Plan Features</Label>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-slate-600">Up to 15 Ad Managers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-slate-600">Up to 50 Client Accounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-slate-600">Advanced AI Recommendations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-slate-600">Priority Support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-slate-600">Custom Reporting</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">Change Plan</Button>
                <Button variant="outline">View All Plans</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">•••• •••• •••• 4242</p>
                    <p className="text-xs text-slate-500">Expires 12/2025</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Update</Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingEmail">Billing Email</Label>
                <Input id="billingEmail" type="email" defaultValue="billing@beezmarketing.com" />
              </div>

              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Payment Info
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View and download past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { date: "Oct 1, 2025", amount: "$499.00", status: "Paid" },
                  { date: "Sep 1, 2025", amount: "$499.00", status: "Paid" },
                  { date: "Aug 1, 2025", amount: "$499.00", status: "Paid" },
                ].map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div>
                      <p className="text-sm text-slate-900">{invoice.date}</p>
                      <p className="text-xs text-slate-500">{invoice.amount}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{invoice.status}</Badge>
                      <Button variant="ghost" size="sm">Download</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

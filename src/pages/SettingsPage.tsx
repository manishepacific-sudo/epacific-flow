import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";

import {
  Settings,
  Shield,
  CreditCard,
  Plug,
  Save,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface GeneralSettings {
  app_name: string;
  app_description: string;
  timezone: string;
  date_format: string;
  language: string;
  maintenance_mode: boolean;
}

interface SecuritySettings {
  session_timeout: number;
  password_min_length: number;
  password_requires_special_char: boolean;
  enable_2fa: boolean;
  max_login_attempts: number;
}

interface PaymentSettings {
  default_payment_amount: number;
  razorpay_enabled: boolean;
  phonepe_enabled: boolean;
  bank_transfer_enabled: boolean;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_account_name: string;
}

interface IntegrationSettings {
  email_provider: 'smtp' | 'sendgrid';
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  sendgrid_api_key: string;
  sms_provider: 'twilio' | 'aws-sns';
  twilio_account_sid: string;
  twilio_auth_token: string;
  aws_sns_access_key: string;
  aws_sns_secret_key: string;
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
}

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // State for all settings
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    app_name: "",
    app_description: "",
    timezone: "UTC",
    date_format: "YYYY-MM-DD",
    language: "en",
    maintenance_mode: false,
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    session_timeout: 30,
    password_min_length: 8,
    password_requires_special_char: true,
    enable_2fa: false,
    max_login_attempts: 5,
  });

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    default_payment_amount: 100,
    razorpay_enabled: false,
    phonepe_enabled: false,
    bank_transfer_enabled: false,
    bank_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_account_name: "",
  });

  const [integrationSettings, setIntegrationSettings] =
    useState<IntegrationSettings>({
      email_provider: "smtp",
      smtp_host: "",
      smtp_port: 587,
      smtp_user: "",
      smtp_pass: "",
      sendgrid_api_key: "",
      sms_provider: "twilio",
      twilio_account_sid: "",
      twilio_auth_token: "",
      aws_sns_access_key: "",
      aws_sns_secret_key: "",
      push_notifications_enabled: false,
      email_notifications_enabled: true,
      sms_notifications_enabled: false,
    });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-settings', {
        body: { action: 'get' },
      });

      if (error) throw error;

      if (data && data.data) {
        const settingsFromServer = data.data;

        const settingsByCategory = settingsFromServer.reduce((acc, setting) => {
            if (!acc[setting.category]) acc[setting.category] = {};
            acc[setting.category][setting.key] = setting.value;
            return acc;
        }, {});

        const mapToState = (defaults, fetched) => {
            const newState = { ...defaults };
            if (!fetched) return newState;

            Object.keys(newState).forEach(key => {
                if (fetched[key] !== undefined) {
                    const value = fetched[key];
                    if (typeof newState[key] === 'boolean') {
                        newState[key] = value === 'true' || value === true;
                    } else if (typeof newState[key] === 'number') {
                        newState[key] = Number(value);
                    } else {
                        newState[key] = value;
                    }
                }
            });
            return newState;
        };

        setGeneralSettings(prev => mapToState(prev, settingsByCategory.general));
        setSecuritySettings(prev => mapToState(prev, settingsByCategory.security));
        setPaymentSettings(prev => mapToState(prev, settingsByCategory.payments));
        setIntegrationSettings(prev => mapToState(prev, settingsByCategory.integrations));
      }
      toast({ title: 'Success', description: 'Settings loaded successfully.' });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: `Failed to load settings: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      let settingsToUpdate;
      let category;

      switch (activeTab) {
        case 'general':
          settingsToUpdate = generalSettings;
          category = 'general';
          break;
        case 'security':
          settingsToUpdate = securitySettings;
          category = 'security';
          break;
        case 'payments':
          settingsToUpdate = paymentSettings;
          category = 'payments';
          break;
        case 'integrations':
          settingsToUpdate = integrationSettings;
          category = 'integrations';
          break;
        default:
          setSaving(false);
          return;
      }

      const updatePromises = Object.entries(settingsToUpdate).map(([key, value]) =>
        supabase.functions.invoke('manage-settings', {
          body: {
            action: 'update',
            payload: {
              category,
              key,
              value: String(value),
            },
          },
        })
      );

      const results = await Promise.all(updatePromises);
      
      const firstErrorResult = results.find(res => res.error);
      if (firstErrorResult) {
          throw firstErrorResult.error;
      }

      toast({
        title: 'Success',
        description: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings saved successfully.`,
      });
    } catch (error: any) {
      console.error(`Error saving ${activeTab} settings:`, error);
      toast({
        title: 'Error',
        description: `Failed to save settings: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [activeTab, generalSettings, securitySettings, paymentSettings, integrationSettings, toast]);

  const renderSaveButton = () => (
    <CardFooter>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Settings
      </Button>
    </CardFooter>
  );

  if (loading) {
    return (
      <Layout role="admin">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div
        className={cn(
          "container mx-auto p-4 sm:p-6 lg:p-8",
          isMobile ? "pb-20" : ""
        )}
      >
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your application settings.
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSettings}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className={cn(
              "grid w-full gap-2",
              isMobile ? "grid-cols-2" : "grid-cols-4"
            )}
          >
            <TabsTrigger value="general">
              <Settings className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Plug className="mr-2 h-4 w-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic application settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-name">App Name</Label>
                  <Input
                    id="app-name"
                    value={generalSettings.app_name}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        app_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-description">App Description</Label>
                  <Textarea
                    id="app-description"
                    value={generalSettings.app_description}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        app_description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={generalSettings.timezone}
                      onValueChange={(value) =>
                        setGeneralSettings({
                          ...generalSettings,
                          timezone: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">
                          America/New_York
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          Europe/London
                        </SelectItem>
                        <SelectItem value="Asia/Kolkata">
                          Asia/Kolkata
                        </SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select
                      value={generalSettings.date_format}
                      onValueChange={(value) =>
                        setGeneralSettings({
                          ...generalSettings,
                          date_format: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={generalSettings.language}
                    onValueChange={(value) =>
                      setGeneralSettings({
                        ...generalSettings,
                        language: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="maintenance-mode"
                    checked={generalSettings.maintenance_mode}
                    onCheckedChange={(checked) =>
                      setGeneralSettings({
                        ...generalSettings,
                        maintenance_mode: checked,
                      })
                    }
                  />
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                </div>
              </CardContent>
              {renderSaveButton()}
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security policies for your application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">
                      Session Timeout (minutes)
                    </Label>
                    <Input
                      id="session-timeout"
                      type="number"
                      value={securitySettings.session_timeout}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          session_timeout: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-min-length">
                      Password Min Length
                    </Label>
                    <Input
                      id="password-min-length"
                      type="number"
                      value={securitySettings.password_min_length}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          password_min_length:
                            parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-login-attempts">
                      Max Login Attempts
                    </Label>
                    <Input
                      id="max-login-attempts"
                      type="number"
                      value={securitySettings.max_login_attempts}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          max_login_attempts: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="require-special-char"
                    checked={securitySettings.password_requires_special_char}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        password_requires_special_char: checked,
                      })
                    }
                  />
                  <Label htmlFor="require-special-char">
                    Require Special Character in Password
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-2fa"
                    checked={securitySettings.enable_2fa}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        enable_2fa: checked,
                      })
                    }
                  />
                  <Label htmlFor="enable-2fa">
                    Enable Two-Factor Authentication (2FA)
                  </Label>
                </div>
              </CardContent>
              {renderSaveButton()}
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Manage payment gateways and options.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="default-payment-amount">
                    Default Payment Amount (₹)
                  </Label>
                  <Input
                    id="default-payment-amount"
                    type="number"
                    value={paymentSettings.default_payment_amount}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        default_payment_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="text-md font-medium">Payment Methods</h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="razorpay-enabled"
                      checked={paymentSettings.razorpay_enabled}
                      onCheckedChange={(checked) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          razorpay_enabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="razorpay-enabled">Enable Razorpay</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="phonepe-enabled"
                      checked={paymentSettings.phonepe_enabled}
                      onCheckedChange={(checked) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          phonepe_enabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="phonepe-enabled">Enable PhonePe</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="bank-transfer-enabled"
                      checked={paymentSettings.bank_transfer_enabled}
                      onCheckedChange={(checked) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          bank_transfer_enabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="bank-transfer-enabled">
                      Enable Bank Transfer
                    </Label>
                  </div>
                </div>
                {paymentSettings.bank_transfer_enabled && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-md font-medium">Bank Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bank-name">Bank Name</Label>
                        <Input
                          id="bank-name"
                          value={paymentSettings.bank_name}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              bank_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account-name">
                          Account Holder Name
                        </Label>
                        <Input
                          id="account-name"
                          value={paymentSettings.bank_account_name}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              bank_account_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account-number">Account Number</Label>
                        <Input
                          id="account-number"
                          value={paymentSettings.bank_account_number}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              bank_account_number: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ifsc-code">IFSC Code</Label>
                        <Input
                          id="ifsc-code"
                          value={paymentSettings.bank_ifsc_code}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              bank_ifsc_code: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              {renderSaveButton()}
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>
                  Connect with third-party services.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 border-b pb-6">
                  <h3 className="text-md font-medium">Email Service</h3>
                  <div className="space-y-2">
                    <Label htmlFor="email-provider">Provider</Label>
                    <Select
                      value={integrationSettings.email_provider}
                      onValueChange={(value) =>
                        setIntegrationSettings({
                          ...integrationSettings,
                          email_provider: value as "smtp" | "sendgrid",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smtp">SMTP</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {integrationSettings.email_provider === "smtp" && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder="SMTP Host"
                        value={integrationSettings.smtp_host}
                        onChange={(e) =>
                          setIntegrationSettings({
                            ...integrationSettings,
                            smtp_host: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="SMTP Port"
                        type="number"
                        value={integrationSettings.smtp_port}
                        onChange={(e) =>
                          setIntegrationSettings({
                            ...integrationSettings,
                            smtp_port: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      <Input
                        placeholder="SMTP Username"
                        value={integrationSettings.smtp_user}
                        onChange={(e) =>
                          setIntegrationSettings({
                            ...integrationSettings,
                            smtp_user: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="SMTP Password"
                        type="password"
                        value={integrationSettings.smtp_pass}
                        onChange={(e) =>
                          setIntegrationSettings({
                            ...integrationSettings,
                            smtp_pass: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                  {integrationSettings.email_provider === "sendgrid" && (
                    <Input
                      placeholder="SendGrid API Key"
                      type="password"
                      value={integrationSettings.sendgrid_api_key}
                      onChange={(e) =>
                        setIntegrationSettings({
                          ...integrationSettings,
                          sendgrid_api_key: e.target.value,
                        })
                      }
                    />
                  )}
                </div>
                <div className="space-y-4 border-b pb-6">
                  <h3 className="text-md font-medium">SMS Service</h3>
                  <div className="space-y-2">
                    <Label htmlFor="sms-provider">Provider</Label>
                    <Select
                      value={integrationSettings.sms_provider}
                      onValueChange={(value) =>
                        setIntegrationSettings({
                          ...integrationSettings,
                          sms_provider: value as "twilio" | "aws-sns",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="aws-sns">AWS SNS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {integrationSettings.sms_provider === "twilio" && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Twilio Account SID"
                        value={integrationSettings.twilio_account_sid}
                        onChange={(e) =>
                          setIntegrationSettings({
                            ...integrationSettings,
                            twilio_account_sid: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Twilio Auth Token"
                        type="password"
                        value={integrationSettings.twilio_auth_token}
                        onChange={(e) =>
                          setIntegrationSettings({
                            ...integrationSettings,
                            twilio_auth_token: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                  {integrationSettings.sms_provider === "aws-sns" && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder="AWS SNS Access Key"
                        value={integrationSettings.aws_sns_access_key}
                        onChange={(e) =>
                          setIntegrationSettings({
                            ...integrationSettings,
                            aws_sns_access_key: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="AWS SNS Secret Key"
                        type="password"
                        value={integrationSettings.aws_sns_secret_key}
                        onChange={(e) =>
                          setIntegrationSettings({
                            ...integrationSettings,
                            aws_sns_secret_key: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h3 className="text-md font-medium">
                    Notification Preferences
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="push-notifications"
                      checked={integrationSettings.push_notifications_enabled}
                      onCheckedChange={(checked) =>
                        setIntegrationSettings({
                          ...integrationSettings,
                          push_notifications_enabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="push-notifications">
                      Enable Push Notifications
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="email-notifications"
                      checked={integrationSettings.email_notifications_enabled}
                      onCheckedChange={(checked) =>
                        setIntegrationSettings({
                          ...integrationSettings,
                          email_notifications_enabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="email-notifications">
                      Enable Email Notifications
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sms-notifications"
                      checked={integrationSettings.sms_notifications_enabled}
                      onCheckedChange={(checked) =>
                        setIntegrationSettings({
                          ...integrationSettings,
                          sms_notifications_enabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="sms-notifications">
                      Enable SMS Notifications
                    </Label>
                  </div>
                </div>
              </CardContent>
              {renderSaveButton()}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SettingsPage;
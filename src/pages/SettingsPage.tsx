import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Save, RefreshCw, Clock, CreditCard, Shield, Plug } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSettingsBatch } from "@/hooks/useSettings";

// TypeScript interfaces
interface SystemSetting {
  id: string
  key: string
  value: any
  category: "system" | "security" | "payments" | "integrations"
  description?: string
  updated_at: string
  updated_by: string
}

interface SessionTimeoutSettings {
  minutes: number
}

interface PaymentMethod {
  id: string
  name: string
  description: string
  enabled: boolean
}

interface BankDetails {
  accountName: string
  accountNumber: string
  ifscCode: string
  bankName: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("security")

  // Use the useSettings hook for fetching settings with defaults
  const { data: settings, isLoading, refetch } = useSettingsBatch([
    'session.timeout.duration',
    'session.timeout.warning',
    'payments.methods',
    'payments.bank.details'
  ]);

  // Settings state with defaults from the hook
  const [sessionTimeout, setSessionTimeout] = useState(settings?.['session.timeout.duration'] ?? 15)
  const [sessionWarning, setSessionWarning] = useState(settings?.['session.timeout.warning'] ?? 2)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(settings?.['payments.methods'] ?? [])
  const [bankDetails, setBankDetails] = useState<BankDetails>(settings?.['payments.bank.details'] ?? {
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: ""
  })

  // Update local state when settings change
  useEffect(() => {
    if (settings) {
      setSessionTimeout(settings['session.timeout.duration'])
      setSessionWarning(settings['session.timeout.warning'])
      setPaymentMethods(settings['payments.methods'])
      setBankDetails(settings['payments.bank.details'])
    }
  }, [settings])

  // Update handlers
  const handleUpdateSessionSettings = async () => {
    try {
      setSaving(true)

      // Ensure values are finite numbers
      if (!Number.isFinite(sessionTimeout) || !Number.isFinite(sessionWarning)) {
        throw new Error("Invalid number values provided")
      }

      if (sessionTimeout <= 0 || sessionWarning <= 0) {
        throw new Error("Duration must be a positive number")
      }

      if (sessionWarning >= sessionTimeout) {
        throw new Error("Warning time must be less than timeout duration")
      }

      // Update both settings
      const [timeoutResponse, warningResponse] = await Promise.all([
        supabase.functions.invoke("manage-settings", {
          body: {
            action: "update",
            payload: {
              category: "security",
              key: "session.timeout.duration",
              value: { minutes: sessionTimeout }
            }
          }
        }),
        supabase.functions.invoke("manage-settings", {
          body: {
            action: "update",
            payload: {
              category: "security",
              key: "session.timeout.warning",
              value: { minutes: sessionWarning }
            }
          }
        })
      ])

      // Check for errors in either response
      if (timeoutResponse.error) throw timeoutResponse.error
      if (warningResponse.error) throw warningResponse.error

      // Refresh settings after successful update
      await refetch()

      toast({
        title: "Success",
        description: "Session settings updated successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update session settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePaymentMethods = async () => {
    try {
      setSaving(true)

      if (!paymentMethods.some(method => method.enabled)) {
        throw new Error("At least one payment method must be enabled")
      }

      const { error } = await supabase.functions.invoke("manage-settings", {
        body: {
          action: "update",
          payload: {
            category: "payments",
            key: "payments.methods",
            value: paymentMethods
          }
        }
      })

      if (error) throw error

      // Refresh settings after successful update
      await refetch()

      toast({
        title: "Success",
        description: "Payment methods updated successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update payment methods",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateBankDetails = async () => {
    try {
      setSaving(true)

      // Validate all fields are filled
      if (Object.values(bankDetails).some(value => !value)) {
        throw new Error("All bank details fields are required")
      }

      const { error } = await supabase.functions.invoke("manage-settings", {
        body: {
          action: "update",
          payload: {
            category: "payments",
            key: "payments.bank.details",
            value: bankDetails
          }
        }
      })

      if (error) throw error

      // Refresh settings after successful update
      await refetch()

      toast({
        title: "Success",
        description: "Bank details updated successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update bank details",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Layout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </Layout>
    )
  }



  return (
    <Layout role="admin">
      <div className="space-y-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-between items-center"
        >
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="w-8 h-8" />
              System Settings
            </h2>
            <p className="text-muted-foreground">
              Configure system-wide settings and preferences
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              toast({
                title: "Refreshing",
                description: "Loading latest settings...",
              });
              await refetch();
            }}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
            <TabsTrigger value="system" className="gap-2">
              <Settings className="w-4 h-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="w-4 h-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="business" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Business Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security">
            <GlassCard className="p-6">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Session Management</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Session Timeout Duration (minutes)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="1"
                      value={sessionTimeout}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isFinite(value)) {
                          setSessionTimeout(value);
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Users will be logged out after this period of inactivity
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warning">Session Warning (minutes)</Label>
                    <Input
                      id="warning"
                      type="number"
                      min="1"
                      value={sessionWarning}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isFinite(value)) {
                          setSessionWarning(value);
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Warning shown before session expires
                    </p>
                  </div>
                  <Button 
                    onClick={handleUpdateSessionSettings}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </TabsContent>

          <TabsContent value="business">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure available payment methods and their settings
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-4">
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{method.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={method.enabled}
                          onCheckedChange={(checked) => {
                            setPaymentMethods(methods =>
                              methods.map(m =>
                                m.id === method.id
                                  ? { ...m, enabled: checked }
                                  : m
                              )
                            )
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      onClick={handleUpdatePaymentMethods}
                      disabled={saving}
                      className="w-full gap-2"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Payment Methods
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bank Account Details</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure bank account information for payment processing
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input
                        id="accountName"
                        value={bankDetails.accountName}
                        onChange={(e) =>
                          setBankDetails(prev => ({
                            ...prev,
                            accountName: e.target.value
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={bankDetails.accountNumber}
                        onChange={(e) =>
                          setBankDetails(prev => ({
                            ...prev,
                            accountNumber: e.target.value
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        value={bankDetails.ifscCode}
                        onChange={(e) =>
                          setBankDetails(prev => ({
                            ...prev,
                            ifscCode: e.target.value.toUpperCase()
                          }))
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        Indian Financial System Code for bank branch identification
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={bankDetails.bankName}
                        onChange={(e) =>
                          setBankDetails(prev => ({
                            ...prev,
                            bankName: e.target.value
                          }))
                        }
                      />
                    </div>
                    <Button
                      onClick={handleUpdateBankDetails}
                      disabled={saving}
                      className="w-full gap-2"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Bank Details
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Business Rules</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Other business workflow settings and configurations
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Additional business rules coming soon</p>
                    <Badge variant="secondary">No additional rules configured yet</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system">
            <GlassCard className="p-6">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">System settings coming soon</p>
                <Badge variant="secondary">No system settings configured yet</Badge>
              </div>
            </GlassCard>
          </TabsContent>

          <TabsContent value="integrations">
            <GlassCard className="p-6">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Integration settings coming soon</p>
                <Badge variant="secondary">No integration settings configured yet</Badge>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
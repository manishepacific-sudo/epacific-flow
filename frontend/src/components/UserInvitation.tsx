import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, UserPlus, Send, Phone, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function UserInvitation() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [stationId, setStationId] = useState("");
  const [centerAddress, setCenterAddress] = useState("");
  const [registrar, setRegistrar] = useState("");
  const [role, setRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({
    mobile_number: '',
    station_id: ''
  });
  const { toast } = useToast();

  const validateMobileNumber = (value: string) => {
    if (!value) return '';
    if (!/^\d+$/.test(value)) return 'Mobile number must contain only digits';
    if (value.length !== 10) return 'Mobile number must be exactly 10 digits';
    return '';
  };

  const validateStationId = (value: string) => {
    if (!value) return '';
    if (!/^\d+$/.test(value)) return 'Station ID must contain only digits';
    if (value.length !== 5) return 'Station ID must be exactly 5 digits';
    return '';
  };

  const handleMobileChange = (value: string) => {
    setMobileNumber(value);
    setFormErrors(prev => ({ ...prev, mobile_number: validateMobileNumber(value) }));
  };

  const handleStationIdChange = (value: string) => {
    setStationId(value);
    setFormErrors(prev => ({ ...prev, station_id: validateStationId(value) }));
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate mobile number if provided
    if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
      toast({
        title: "Invalid mobile number",
        description: "Mobile number must be exactly 10 digits",
        variant: "destructive"
      });
      return;
    }

    // Validate station ID if provided
    if (stationId && !/^\d{5}$/.test(stationId)) {
      toast({
        title: "Invalid station ID",
        description: "Station ID must be exactly 5 digits",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('user-invite', {
        body: {
          email: email,
          role: role,
          full_name: fullName,
          mobile_number: mobileNumber,
          station_id: stationId,
          center_address: centerAddress,
          registrar: registrar
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to invite user');
      }

      toast({
        title: "User invited successfully",
        description: `Invitation sent to ${email} with role: ${role}`,
      });

      // Reset form
      setEmail("");
      setFullName("");
      setMobileNumber("");
      setStationId("");
      setCenterAddress("");
      setRegistrar("");
      setRole('user');
      setFormErrors({
        mobile_number: '',
        station_id: ''
      });

    } catch (error: any) {
      console.error('Invite user error:', error);
      toast({
        title: "Failed to invite user",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Invite New User</h3>
            <p className="text-sm text-muted-foreground">
              Send an invitation to join the platform
            </p>
          </div>
        </div>

        <form onSubmit={handleInviteUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobileNumber" className="text-sm font-medium">
                Mobile Number
              </Label>
              <Input
                id="mobileNumber"
                type="tel"
                placeholder="1234567890"
                value={mobileNumber}
                onChange={(e) => handleMobileChange(e.target.value)}
                className={formErrors.mobile_number ? 'border-destructive' : ''}
              />
              {formErrors.mobile_number && (
                <p className="text-sm text-destructive">{formErrors.mobile_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stationId" className="text-sm font-medium">
                Station ID
              </Label>
              <Input
                id="stationId"
                type="text"
                placeholder="12345"
                value={stationId}
                onChange={(e) => handleStationIdChange(e.target.value)}
                className={formErrors.station_id ? 'border-destructive' : ''}
              />
              {formErrors.station_id && (
                <p className="text-sm text-destructive">{formErrors.station_id}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="centerAddress" className="text-sm font-medium">
              Center Address
            </Label>
            <Input
              id="centerAddress"
              type="text"
              placeholder="123 Main St, City, State"
              value={centerAddress}
              onChange={(e) => setCenterAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrar" className="text-sm font-medium">
              Registrar
            </Label>
            <Input
              id="registrar"
              type="text"
              placeholder="Registrar Name"
              value={registrar}
              onChange={(e) => setRegistrar(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">
              Role
            </Label>
            <Select value={role} onValueChange={(value: 'admin' | 'manager' | 'user') => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={loading || !email || !fullName}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {loading ? "Sending Invitation..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  );
}
import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Camera, User, Lock, Save, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, useTranslations } from '@/contexts/LanguageContext';
import { ImageCropper } from '@/components/ImageCropper';
import { ThemeToggle } from '@/components/ThemeToggle';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

// iOS-style section group
function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-[12px] overflow-hidden divide-y divide-border/60">
      {children}
    </div>
  );
}

// iOS-style row
function SettingsRow({ label, children, className = '' }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-4 py-3 flex items-center gap-3 min-h-[44px] ${className}`}>
      {label && <span className="text-sm text-foreground whitespace-nowrap min-w-[100px]">{label}</span>}
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground uppercase tracking-wide px-4 pb-1.5 pt-6 first:pt-0">
      {children}
    </p>
  );
}

function SectionFooter({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground px-4 pt-1.5 pb-2">
      {children}
    </p>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, token, updateUser } = useAuth();
  const { language } = useLanguage();
  const t = useTranslations();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'avatar.jpg');
      const uploadResponse = await fetch(`${API_BASE_URL}/api/users/upload-avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json();
      const newAvatarUrl = uploadData.url;
      const profileResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName || user?.full_name, phone: phone || user?.phone, avatar_url: newAvatarUrl }),
      });
      if (!profileResponse.ok) throw new Error('Failed to save avatar');
      setAvatarUrl(newAvatarUrl);
      updateUser({ avatar_url: newAvatarUrl });
      toast({ title: language === 'km' ? 'ជោគជ័យ' : 'Success', description: language === 'km' ? 'រូបភាពត្រូវបានរក្សាទុក' : 'Profile picture saved successfully' });
    } catch {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: language === 'km' ? 'បរាជ័យក្នុងការផ្ទុករូបភាព' : 'Failed to upload image', variant: 'destructive' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName, phone, avatar_url: avatarUrl }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.message || 'Update failed'); }
      updateUser({ full_name: fullName, phone, avatar_url: avatarUrl });
      toast({ title: language === 'km' ? 'ជោគជ័យ' : 'Success', description: language === 'km' ? 'ព័ត៌មានផ្ទាល់ខ្លួនត្រូវបានធ្វើបច្ចុប្បន្នភាព' : 'Profile updated successfully' });
    } catch (error) {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: error instanceof Error ? error.message : 'Failed to update profile', variant: 'destructive' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: language === 'km' ? 'ពាក្យសម្ងាត់មិនត្រូវគ្នា' : 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Password change failed');
      toast({ title: language === 'km' ? 'ជោគជ័យ' : 'Success', description: language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរ' : 'Password changed successfully' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) {
      toast({ title: language === 'km' ? 'កំហុស' : 'Error', description: error instanceof Error ? error.message : 'Failed to change password', variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) { navigate('/auth'); return null; }

  const iosInputClass = "bg-transparent border-none shadow-none focus-visible:ring-0 h-auto p-0 text-sm text-foreground placeholder:text-muted-foreground/50 text-right";

  return (
    <div className={`min-h-screen bg-secondary/50 ${language === 'km' ? 'font-khmer' : ''}`}>
      {/* iOS-style nav bar */}
      <header className="sticky top-0 z-40 glass px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-0.5 text-sm text-primary font-medium transition-opacity hover:opacity-70"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'km' ? 'ត្រឡប់' : 'Back'}
          </button>
          <span className="text-sm font-semibold text-foreground">{t.profileSettings}</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile card — iOS Apple ID style */}
        <SettingsGroup>
          <div className="p-4 flex items-center gap-3.5">
            <div className="relative flex-shrink-0">
              <Avatar className="w-[60px] h-[60px]">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-xl bg-muted text-foreground font-medium">
                  {fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm disabled:opacity-50"
              >
                {isUploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground truncate">{fullName || user.email?.split('@')[0]}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary mt-0.5 font-medium"
              >
                {language === 'km' ? 'ផ្លាស់ប្តូររូបភាព' : 'Change Photo'}
              </button>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
          </div>
        </SettingsGroup>

        {/* Personal Info */}
        <div>
          <SectionLabel>{t.personalInfo}</SectionLabel>
          <SettingsGroup>
            <SettingsRow label={t.email}>
              <p className="text-sm text-muted-foreground text-right truncate">{user.email}</p>
            </SettingsRow>
            <SettingsRow label={t.fullName}>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={language === 'km' ? 'បញ្ចូលឈ្មោះពេញ' : 'Enter name'}
                className={iosInputClass}
              />
            </SettingsRow>
            <SettingsRow label={t.phone}>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={language === 'km' ? 'បញ្ចូលលេខទូរស័ព្ទ' : 'Enter phone'}
                className={iosInputClass}
              />
            </SettingsRow>
          </SettingsGroup>
          <SectionFooter>
            {language === 'km' ? 'អ៊ីមែលមិនអាចផ្លាស់ប្តូរបានទេ។' : 'Email address cannot be changed.'}
          </SectionFooter>

          <div className="mt-3">
            <SettingsGroup>
              <button
                onClick={handleUpdateProfile}
                disabled={isUpdatingProfile}
                className="w-full px-4 py-3 text-sm font-medium text-primary text-center disabled:opacity-50 active:bg-accent/50 transition-colors"
              >
                {isUpdatingProfile ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...'}
                  </span>
                ) : (
                  language === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes'
                )}
              </button>
            </SettingsGroup>
          </div>
        </div>

        {/* Change Password */}
        <div>
          <SectionLabel>{t.changePassword}</SectionLabel>
          <SettingsGroup>
            <SettingsRow label={language === 'km' ? 'បច្ចុប្បន្ន' : 'Current'}>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={iosInputClass}
              />
            </SettingsRow>
            <SettingsRow label={language === 'km' ? 'ថ្មី' : 'New'}>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={iosInputClass}
              />
            </SettingsRow>
            <SettingsRow label={language === 'km' ? 'បញ្ជាក់' : 'Confirm'}>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={iosInputClass}
              />
            </SettingsRow>
          </SettingsGroup>
          <SectionFooter>
            {language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។' : 'Password must be at least 6 characters.'}
          </SectionFooter>

          <div className="mt-3">
            <SettingsGroup>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full px-4 py-3 text-sm font-medium text-primary text-center disabled:opacity-50 disabled:text-muted-foreground active:bg-accent/50 transition-colors"
              >
                {isChangingPassword ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === 'km' ? 'កំពុងផ្លាស់ប្តូរ...' : 'Changing...'}
                  </span>
                ) : (
                  t.changePassword
                )}
              </button>
            </SettingsGroup>
          </div>
        </div>
      </div>

      <ImageCropper isOpen={cropperOpen} onClose={() => setCropperOpen(false)} imageSrc={selectedImage} onCropComplete={handleCropComplete} />
    </div>
  );
}

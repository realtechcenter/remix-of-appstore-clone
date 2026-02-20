import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Camera, User, Lock, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, useTranslations } from '@/contexts/LanguageContext';
import { ImageCropper } from '@/components/ImageCropper';
import { ThemeToggle } from '@/components/ThemeToggle';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

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

  return (
    <div className={`min-h-screen bg-background ${language === 'km' ? 'font-khmer' : ''}`}>
      {/* Notion-style top bar */}
      <header className="sticky top-0 z-40 glass px-4 sm:px-8 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-sm hover:bg-accent"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {language === 'km' ? 'ត្រឡប់' : 'Back'}
            </button>
            <span className="text-muted-foreground/40 text-sm">/</span>
            <Link to="/" className="text-sm font-medium text-foreground hover:text-muted-foreground transition-colors">
              Macsofy
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-10">
        {/* Page title — Notion doc style */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">{t.profileSettings}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'km' ? 'គ្រប់គ្រងព័ត៌មានគណនីរបស់អ្នក' : 'Manage your account information'}
          </p>
        </div>

        {/* Personal Info Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t.personalInfo}</h2>
          </div>
          <div className="border border-border rounded-md bg-card divide-y divide-border">
            {/* Avatar row */}
            <div className="p-5 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <Avatar className="w-16 h-16 border border-border">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="text-lg bg-muted text-foreground font-medium">
                    {fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {isUploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </div>
              <div>
                <p className="text-sm font-medium">{fullName || user.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
                >
                  {language === 'km' ? 'ផ្លាស់ប្តូររូបភាព' : 'Change photo'}
                </button>
              </div>
            </div>

            {/* Email row */}
            <div className="p-5 space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wide">{t.email}</Label>
              <Input id="email" type="email" value={user.email} disabled className="bg-muted text-muted-foreground h-9 text-sm" />
              <p className="text-xs text-muted-foreground">{language === 'km' ? 'អ៊ីមែលមិនអាចផ្លាស់ប្តូរបានទេ' : 'Email cannot be changed'}</p>
            </div>

            {/* Full name row */}
            <div className="p-5 space-y-1.5">
              <Label htmlFor="fullName" className="text-xs text-muted-foreground uppercase tracking-wide">{t.fullName}</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={language === 'km' ? 'បញ្ចូលឈ្មោះពេញ' : 'Enter your full name'}
                className="h-9 text-sm"
              />
            </div>

            {/* Phone row */}
            <div className="p-5 space-y-1.5">
              <Label htmlFor="phone" className="text-xs text-muted-foreground uppercase tracking-wide">{t.phone}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={language === 'km' ? 'បញ្ចូលលេខទូរស័ព្ទ' : 'Enter your phone number'}
                className="h-9 text-sm"
              />
            </div>

            {/* Save button row */}
            <div className="p-5">
              <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile} size="sm">
                {isUpdatingProfile ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{language === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...'}</> : <><Save className="w-3.5 h-3.5" />{t.saveChanges}</>}
              </Button>
            </div>
          </div>
        </section>

        {/* Password Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t.changePassword}</h2>
          </div>
          <div className="border border-border rounded-md bg-card divide-y divide-border">
            <div className="p-5 space-y-1.5">
              <Label htmlFor="currentPassword" className="text-xs text-muted-foreground uppercase tracking-wide">
                {language === 'km' ? 'ពាក្យសម្ងាត់បច្ចុប្បន្ន' : 'Current Password'}
              </Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" />
            </div>
            <div className="p-5 space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs text-muted-foreground uppercase tracking-wide">
                {language === 'km' ? 'ពាក្យសម្ងាត់ថ្មី' : 'New Password'}
              </Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" />
            </div>
            <div className="p-5 space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground uppercase tracking-wide">
                {language === 'km' ? 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី' : 'Confirm New Password'}
              </Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" />
            </div>
            <div className="p-5">
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                variant="secondary"
                size="sm"
              >
                {isChangingPassword ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{language === 'km' ? 'កំពុងផ្លាស់ប្តូរ...' : 'Changing...'}</> : <><Lock className="w-3.5 h-3.5" />{t.changePassword}</>}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <ImageCropper isOpen={cropperOpen} onClose={() => setCropperOpen(false)} imageSrc={selectedImage} onCropComplete={handleCropComplete} />
    </div>
  );
}

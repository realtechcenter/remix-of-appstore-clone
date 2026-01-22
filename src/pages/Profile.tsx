import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, User, Lock, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, useTranslations } from '@/contexts/LanguageContext';
import { ImageCropper } from '@/components/ImageCropper';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, token } = useAuth();
  const { language } = useLanguage();
  const t = useTranslations();

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Image cropper state
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
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'avatar.jpg');
      formData.append('type', 'avatars');

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setAvatarUrl(data.url);
      
      toast({
        title: language === 'km' ? 'ជោគជ័យ' : 'Success',
        description: language === 'km' ? 'រូបភាពត្រូវបានផ្ទុកឡើង' : 'Image uploaded successfully',
      });
    } catch (error) {
      toast({
        title: language === 'km' ? 'កំហុស' : 'Error',
        description: language === 'km' ? 'បរាជ័យក្នុងការផ្ទុករូបភាព' : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          avatar_url: avatarUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Update failed');
      }

      // Update local storage
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.full_name = fullName;
        userData.phone = phone;
        userData.avatar_url = avatarUrl;
        localStorage.setItem('auth_user', JSON.stringify(userData));
      }

      toast({
        title: language === 'km' ? 'ជោគជ័យ' : 'Success',
        description: language === 'km' ? 'ព័ត៌មានផ្ទាល់ខ្លួនត្រូវបានធ្វើបច្ចុប្បន្នភាព' : 'Profile updated successfully',
      });

      // Reload to reflect changes
      window.location.reload();
    } catch (error) {
      toast({
        title: language === 'km' ? 'កំហុស' : 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: language === 'km' ? 'កំហុស' : 'Error',
        description: language === 'km' ? 'ពាក្យសម្ងាត់មិនត្រូវគ្នា' : 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: language === 'km' ? 'កំហុស' : 'Error',
        description: language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ' : 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Password change failed');
      }

      toast({
        title: language === 'km' ? 'ជោគជ័យ' : 'Success',
        description: language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរ' : 'Password changed successfully',
      });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: language === 'km' ? 'កំហុស' : 'Error',
        description: error instanceof Error ? error.message : 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className={`min-h-screen bg-background ${language === 'km' ? 'font-khmer' : ''}`}>
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t.profileSettings}</h1>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t.personalInfo}
            </CardTitle>
            <CardDescription>
              {language === 'km' ? 'ធ្វើបច្ចុប្បន្នភាពព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក' : 'Update your personal information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'km' ? 'ចុចដើម្បីផ្លាស់ប្តូររូបភាព' : 'Click to change photo'}
              </p>
            </div>

            <Separator />

            {/* Form fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'km' ? 'អ៊ីមែលមិនអាចផ្លាស់ប្តូរបានទេ' : 'Email cannot be changed'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">{t.fullName}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={language === 'km' ? 'បញ្ចូលឈ្មោះពេញ' : 'Enter your full name'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={language === 'km' ? 'បញ្ចូលលេខទូរស័ព្ទ' : 'Enter your phone number'}
                />
              </div>

              <Button 
                onClick={handleUpdateProfile} 
                disabled={isUpdatingProfile}
                className="w-full"
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t.saveChanges}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t.changePassword}
            </CardTitle>
            <CardDescription>
              {language === 'km' ? 'ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់របស់អ្នក' : 'Update your password'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                {language === 'km' ? 'ពាក្យសម្ងាត់បច្ចុប្បន្ន' : 'Current Password'}
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">
                {language === 'km' ? 'ពាក្យសម្ងាត់ថ្មី' : 'New Password'}
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {language === 'km' ? 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី' : 'Confirm New Password'}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button 
              onClick={handleChangePassword} 
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full"
              variant="secondary"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'km' ? 'កំពុងផ្លាស់ប្តូរ...' : 'Changing...'}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  {t.changePassword}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Image Cropper Dialog */}
      <ImageCropper
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={selectedImage}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Video, Download, CreditCard, HelpCircle, BookOpen } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Disclaimer = () => {
  const { language } = useLanguage();
  const isKm = language === "km";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {isKm ? "សេចក្តីបដិសេធ" : "Disclaimer"}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {isKm
              ? "សូមអានមុនពេលប្រើប្រាស់សេវាកម្មរបស់យើង"
              : "Please Read Before Using Our Services"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
            {isKm
              ? "ព័ត៌មានខាងក្រោមពន្យល់ពីអ្វីដែល Macsofy ផ្តល់ជូន និងរបៀបដែលសេវាកម្មរបស់យើងដំណើរការ"
              : "The information below explains what Macsofy offers and how our services work."}
          </p>
        </div>

        <Separator />

        {/* What We Offer */}
        <Card className="border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {isKm ? "អ្វីដែលយើងផ្តល់ជូន" : "What We Offer"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isKm
                ? "Macsofy ផ្តល់សេវាកម្មវីដេអូបង្រៀន (Tutorial) សម្រាប់ការណែនាំពីរបៀបដំឡើង និងការប្រើប្រាស់កម្មវិធីផ្សេងៗ។ នៅពេលអ្នកទិញនៅលើ Macsofy អ្នកកំពុងទិញវីដេអូបង្រៀនដែលបង្ហាញពីរបៀបដំឡើង និងប្រើប្រាស់កម្មវិធីជាជំហានៗ។"
                : "Macsofy provides video tutorial services for guiding users through app installation and usage. When you make a purchase on Macsofy, you are purchasing a video tutorial guide that shows step-by-step instructions on how to install and use the application."}
            </p>
          </CardContent>
        </Card>

        {/* Apps Are Free */}
        <Card className="border-green-500/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {isKm ? "កម្មវិធីទាញយកដោយឥតគិតថ្លៃ" : "Apps Are Free to Download"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isKm
                ? "កម្មវិធីទាំងអស់ដែលមាននៅលើគេហទំព័ររបស់យើងអាចទាញយកបានដោយឥតគិតថ្លៃ បន្ទាប់ពីអ្នកទិញវីដេអូបង្រៀន។ ការទូទាត់គឺសម្រាប់តែសេវាកម្មវីដេអូបង្រៀនប៉ុណ្ណោះ មិនមែនសម្រាប់កម្មវិធីខ្លួនឯងទេ។"
                : "All applications available on our website are free to download after you purchase the tutorial guide. The payment is only for the video tutorial service, not for the application software itself."}
            </p>
          </CardContent>
        </Card>

        {/* What You Pay For */}
        <Card className="border-amber-500/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {isKm ? "អ្វីដែលអ្នកបង់ប្រាក់សម្រាប់" : "What You Pay For"}
              </h3>
            </div>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {(isKm
                ? [
                    "វីដេអូបង្រៀនជំហានៗពីរបៀបដំឡើងកម្មវិធី",
                    "ការណែនាំពីរបៀបប្រើប្រាស់មុខងារសំខាន់ៗ",
                    "ជំនួយបច្ចេកទេស និងការគាំទ្រ",
                    "ការទាញយកកម្មវិធីដោយឥតគិតថ្លៃ បន្ទាប់ពីទិញវីដេអូបង្រៀន",
                  ]
                : [
                    "Step-by-step video tutorial on how to install the application",
                    "Guidance on how to use key features of the application",
                    "Technical support and assistance",
                    "Free app download after purchasing the tutorial video",
                  ]
              ).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {isKm ? "ចំណាំសំខាន់" : "Important Notice"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isKm
                ? "Macsofy មិនមែនជាអ្នកលក់កម្មវិធីទេ។ យើងផ្តល់សេវាកម្មបង្រៀន និងណែនាំអំពីការដំឡើង និងការប្រើប្រាស់កម្មវិធី។ កម្មវិធីទាំងអស់ជាកម្មសិទ្ធិរបស់ក្រុមហ៊ុនអ្នកអភិវឌ្ឍន៍រៀងៗខ្លួន។ Macsofy មិនទទួលខុសត្រូវចំពោះបញ្ហាកម្មវិធី ឬការខូចខាតណាមួយដែលកើតឡើងពីការប្រើប្រាស់កម្មវិធីទេ។"
                : "Macsofy is not a software seller. We provide tutorial and guidance services for app installation and usage. All applications are the property of their respective developers. Macsofy is not responsible for any software issues or damages that may arise from the use of the applications."}
            </p>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {isKm ? "សង្ខេប" : "Summary"}
              </h3>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground leading-relaxed">
              {isKm
                ? "ការទូទាត់នៅ Macsofy = វីដេអូបង្រៀន (Tutorial) ។ កម្មវិធី = ទាញយកដោយឥតគិតថ្លៃបន្ទាប់ពីទិញវីដេអូបង្រៀន។ Macsofy ≠ អ្នកលក់កម្មវិធី។"
                : "Payment on Macsofy = Video Tutorial Guide. Apps = Free to download after purchasing the tutorial. Macsofy ≠ Software Seller."}
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center pt-4">
          <Link to="/">
            <Button variant="outline">
              {isKm ? "ត្រឡប់ទៅទំព័រដើម" : "Back to Home"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;

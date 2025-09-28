// 🎯 GAMIFICATION PANEL - DA VINCI v6.0 Phase 4
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy,
  Star,
  Target,
  Zap,
  Gift,
  Medal,
  Crown,
  Award,
  Flame,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { Link } from 'wouter';

interface GamifiedProfile {
  representativeId: number;
  representativeName: string;
  xpSystem: {
    currentXP: number;
    currentLevel: number;
    xpToNextLevel: number;
    totalXP: number;
    levelProgress: number;
    levelTitle: string;
    levelDescription: string;
    nextLevelTitle: string;
    culturalRank: string;
  };
  achievements: any[];
  badges: any[];
  activeChallenges: any[];
  completedChallenges: any[];
  stats: {
    totalTasksCompleted: number;
    perfectMonths: number;
    streakDays: number;
    culturalAdaptationScore: number;
    relationshipBuildingScore: number;
    salesMasteryLevel: number;
  };
  motivationalQuotes: string[];
  nextMilestones: any[];
  leaderboardPosition: number;
}

interface Leaderboard {
  period: string;
  rankings: {
    rank: number;
    representativeId: number;
    representativeName: string;
    score: number;
    badge: string;
    change: number;
    achievements: string[];
    culturalTitle: string;
  }[];
  topThree: {
    first: any;
    second: any;
    third: any;
  };
}

export function GamificationPanel() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<string>('1819');
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('monthly');

  // Gamified profile query
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery<GamifiedProfile>({
    queryKey: ['/api/crm/gamification/profile', selectedRepresentative],
    enabled: !!selectedRepresentative,
    refetchInterval: 60000
  });

  // Leaderboard query
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<Leaderboard>({
    queryKey: ['/api/crm/gamification/leaderboard', selectedPeriod],
    refetchInterval: 60000
  });

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-600 text-white';
    if (rank === 2) return 'bg-gray-400 text-white';
    if (rank === 3) return 'bg-amber-600 text-white';
    if (rank <= 10) return 'bg-blue-600 text-white';
    return 'bg-gray-600 text-white';
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'BRONZE': return '🥉';
      case 'SILVER': return '🥈';
      case 'GOLD': return '🥇';
      case 'PLATINUM': return '💎';
      case 'DIAMOND': return '💠';
      default: return '⭐';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'text-green-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'HARD': return 'text-orange-600';
      case 'EXTREME': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (profileLoading || leaderboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری سیستم انگیزشی...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 ml-1" />
              بازگشت به داشبورد
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-600" />
              سیستم انگیزشی هوشمند
            </h1>
            <p className="text-muted-foreground">
              رقابت سالم و پیشرفت مستمر با هوش مصنوعی فارسی
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => refetchProfile()} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 ml-1" />
            بروزرسانی
          </Button>
        </div>
      </div>

      {/* User Profile Summary */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                {profile.xpSystem.levelTitle}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{profile.xpSystem.culturalRank}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>سطح {profile.xpSystem.currentLevel}</span>
                  <span>{formatNumber(profile.xpSystem.currentXP)} XP</span>
                </div>
                <Progress value={profile.xpSystem.levelProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {formatNumber(profile.xpSystem.xpToNextLevel)} XP تا {profile.xpSystem.nextLevelTitle}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                رتبه در جدول
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-lg font-bold ${getRankBadgeColor(profile.leaderboardPosition)}`}>
                  #{profile.leaderboardPosition}
                </div>
                <p className="text-sm text-muted-foreground mt-2">از {leaderboard?.rankings.length || 0} نفر</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-600" />
                رکورد پیاپی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{profile.stats.streakDays}</div>
                <p className="text-sm text-muted-foreground">روز متوالی</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                دستاوردها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{profile.achievements.length}</div>
                <p className="text-sm text-muted-foreground">دستاورد کسب شده</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">پروفایل من</TabsTrigger>
          <TabsTrigger value="leaderboard">جدول امتیازات</TabsTrigger>
          <TabsTrigger value="challenges">چالش‌ها</TabsTrigger>
          <TabsTrigger value="achievements">دستاوردها</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {profile && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stats Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    آمار عملکرد
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{profile.stats.totalTasksCompleted}</div>
                      <p className="text-sm text-muted-foreground">وظیفه تکمیل شده</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{profile.stats.perfectMonths}</div>
                      <p className="text-sm text-muted-foreground">ماه کامل</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{profile.stats.culturalAdaptationScore}</div>
                      <p className="text-sm text-muted-foreground">سازگاری فرهنگی</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{profile.stats.salesMasteryLevel}</div>
                      <p className="text-sm text-muted-foreground">سطح تسلط فروش</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Motivational Quotes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-600" />
                    انگیزه روزانه
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.motivationalQuotes.map((quote, index) => (
                      <div key={index} className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-r-4 border-blue-500">
                        <p className="text-sm font-medium text-center italic">"{quote}"</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Next Milestones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    هدف‌های بعدی
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.nextMilestones.map((milestone, index) => (
                      <div key={milestone.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="text-2xl">{getTierIcon(milestone.tier)}</div>
                        <div className="flex-1">
                          <h4 className="font-medium">{milestone.title}</h4>
                          <p className="text-sm text-muted-foreground">{milestone.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">{milestone.xpReward} XP</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Badges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="h-5 w-5" />
                    نشان‌های افتخار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {profile.badges.map((badge, index) => (
                      <div key={badge.id} className="text-center p-4 border rounded-lg hover:bg-gray-50">
                        <div className="text-2xl mb-2">{badge.icon}</div>
                        <h4 className="font-medium text-sm">{badge.name}</h4>
                        <p className="text-xs text-muted-foreground">{badge.culturalSignificance}</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {badge.rarity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          {leaderboard && (
            <div>
              {/* Top 3 Podium */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-center flex items-center justify-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                    برترین‌های ماه
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center items-end gap-8">
                    {/* Second Place */}
                    {leaderboard.topThree.second && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                          2
                        </div>
                        <h3 className="font-medium text-sm">{leaderboard.topThree.second.representativeName}</h3>
                        <p className="text-xs text-muted-foreground">{formatNumber(leaderboard.topThree.second.score)} امتیاز</p>
                        <div className="text-sm mt-1">{leaderboard.topThree.second.badge}</div>
                      </div>
                    )}

                    {/* First Place */}
                    {leaderboard.topThree.first && (
                      <div className="text-center">
                        <Crown className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                        <div className="w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2">
                          1
                        </div>
                        <h3 className="font-bold">{leaderboard.topThree.first.representativeName}</h3>
                        <p className="text-sm text-muted-foreground">{formatNumber(leaderboard.topThree.first.score)} امتیاز</p>
                        <div className="text-lg mt-1">{leaderboard.topThree.first.badge}</div>
                      </div>
                    )}

                    {/* Third Place */}
                    {leaderboard.topThree.third && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                          3
                        </div>
                        <h3 className="font-medium text-sm">{leaderboard.topThree.third.representativeName}</h3>
                        <p className="text-xs text-muted-foreground">{formatNumber(leaderboard.topThree.third.score)} امتیاز</p>
                        <div className="text-sm mt-1">{leaderboard.topThree.third.badge}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Full Rankings */}
              <Card>
                <CardHeader>
                  <CardTitle>جدول کامل امتیازات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leaderboard.rankings.slice(0, 20).map((ranking, index) => (
                      <div key={ranking.representativeId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeColor(ranking.rank)}`}>
                            {ranking.rank}
                          </div>
                          <div>
                            <h4 className="font-medium">{ranking.representativeName}</h4>
                            <p className="text-sm text-muted-foreground">{ranking.culturalTitle}</p>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="font-bold">{formatNumber(ranking.score)} امتیاز</div>
                          <div className="text-sm">{ranking.badge}</div>
                          {ranking.change !== 0 && (
                            <div className={`text-xs flex items-center gap-1 ${ranking.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {ranking.change > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {Math.abs(ranking.change)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          {profile && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Challenges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    چالش‌های فعال
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.activeChallenges.map((challenge, index) => (
                    <div key={challenge.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{challenge.title}</h4>
                          <p className="text-sm text-muted-foreground">{challenge.persianDescription}</p>
                        </div>
                        <Badge variant="outline" className={getDifficultyColor(challenge.difficulty)}>
                          {challenge.difficulty}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>پیشرفت:</span>
                          <span>{challenge.progress}/{challenge.maxProgress}</span>
                        </div>
                        <Progress value={(challenge.progress / challenge.maxProgress) * 100} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">{challenge.xpReward} XP</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>تا {new Date(challenge.deadline).toLocaleDateString('fa-IR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Challenge Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    آمار چالش‌ها
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{profile.activeChallenges.length}</div>
                      <p className="text-sm text-muted-foreground">چالش فعال</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{profile.completedChallenges.length}</div>
                      <p className="text-sm text-muted-foreground">تکمیل شده</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">💡 نکته:</h4>
                    <p className="text-sm text-muted-foreground">
                      با تکمیل چالش‌های روزانه، امتیاز بیشتری کسب کرده و در جدول امتیازات بالاتر بروید.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          {profile && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.achievements.map((achievement, index) => (
                <Card key={achievement.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="text-3xl">{getTierIcon(achievement.tier)}</div>
                      <Badge variant="outline" className="text-xs">
                        {achievement.tier}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{achievement.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">{achievement.xpReward} XP</span>
                      </div>
                      <div className="p-2 bg-green-50 rounded border-r-4 border-green-500">
                        <p className="text-sm font-medium text-green-800">{achievement.persianMotivation}</p>
                      </div>
                      {achievement.unlockedAt && (
                        <p className="text-xs text-muted-foreground">
                          کسب شده در: {new Date(achievement.unlockedAt).toLocaleDateString('fa-IR')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
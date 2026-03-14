import { 
  ArrowLeft02Icon, 
  Notification03Icon, 
  Cancel01Icon,
  Delete02Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { 
  ActivityIndicator, 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../lib/firebase";
import { format } from "date-fns";

type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: any;
  date: string;
  read: boolean;
};

export default function NotificationsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    const notificationsRef = collection(db, 'users', user.id, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        
        // Mark as read if it is currently unread
        if (data.read === false) {
          updateDoc(doc(db, 'users', user.id, 'notifications', docSnap.id), { read: true })
            .catch(err => console.error("Error marking read:", err));
        }

        return {
          id: docSnap.id,
          ...data
        } as AppNotification;
      });
      setNotifications(logs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const deleteNotification = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.id, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const timeStr = item.createdAt?.toDate() 
      ? format(item.createdAt.toDate(), 'h:mm a') 
      : 'Just now';

    return (
      <View style={styles.notificationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <HugeiconsIcon icon={Notification03Icon} size={20} color="#009050" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifBody}>{item.body}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteNotification(item.id)}>
            <HugeiconsIcon icon={Delete02Icon} size={18} color="#CBD5E0" />
          </TouchableOpacity>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.notifTime}>{item.date} • {timeStr}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009050" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <HugeiconsIcon icon={ArrowLeft02Icon} size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
                <HugeiconsIcon icon={Notification03Icon} size={48} color="#CBD5E0" />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              Reminders and updates will appear here once they are sent.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FFF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4,
  },
  notifBody: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  cardFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
    paddingTop: 8,
  },
  notifTime: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 22,
  }
});

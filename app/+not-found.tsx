import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotFoundScreen() {
  const { t } = useLanguage();

  return (
    <>
      <Stack.Screen options={{ title: t('oops') }} />
      <View style={styles.container}>
        <Text style={styles.text}>{t('screenDoesNotExist')}</Text>
        <Link href="/" style={styles.link}>
          <Text>{t('goToHomeScreen')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 600,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});

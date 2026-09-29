import { HomeContainer } from '@/containers/HomeContainer';
import { getMessages, readLocale } from '@/lib/i18n/messages';

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const locale = readLocale((await params).locale);
  return <HomeContainer messages={getMessages(locale)} />;
}

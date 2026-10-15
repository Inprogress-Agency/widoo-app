import type { LegalDoc } from '@widoo/shared';
import { fontFamilies, spacing, type IconName } from '@widoo/tokens';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text as NativeText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { TopBar } from '../ui/TopBar';
import { useLegalDocument } from './documents';
import { blocksOf, type Block, type Span } from './markdown';

/** The three sentences of « L'essentiel », in order (Ecrans › E-19, politique). */
const summaryIcons: IconName[] = ['user', 'map-pin', 'chart-bar'];

const barTitleKey = { terms: 'settings.terms', privacy: 'settings.privacyPolicy' } as const;

/**
 * Conditions d'utilisation and Politique de confidentialité in native pages (Ecrans › E-19,
 * D-063): the text served by the API in the language of the app and kept on the phone, so it
 * reads offline. The bar has no title at rest; it gets it once the big title has scrolled under
 * it. Big title and articles are headers, for the navigation by headings.
 */
export function LegalScreen({ doc }: { doc: LegalDoc }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const document = useLegalDocument(doc);
  // A text not yet translated is served in French: its date and « L'essentiel » follow it.
  const tText = i18n.getFixedT(document.locale);
  const [titleBottom, setTitleBottom] = useState(0);
  const [isTitleUnder, setIsTitleUnder] = useState(false);
  const updated = new Intl.DateTimeFormat(document.locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(document.updatedAt));

  return (
    <View className="flex-1 bg-bg">
      <TopBar
        title={isTitleUnder ? t(barTitleKey[doc]) : ''}
        back={{ label: t('legal.back'), onPress: () => router.back() }}
      />
      <ScrollView
        contentContainerClassName="gap-16 px-16 pt-16"
        // Safe area measured at runtime.
        contentContainerStyle={{ paddingBottom: spacing['space-32'] + insets.bottom }}
        scrollEventThrottle={16}
        onScroll={(event) =>
          setIsTitleUnder(titleBottom > 0 && event.nativeEvent.contentOffset.y >= titleBottom)
        }
      >
        <View
          className="gap-4"
          onLayout={(event) =>
            setTitleBottom(event.nativeEvent.layout.y + event.nativeEvent.layout.height)
          }
        >
          <Text variant="title-xl" accessibilityRole="header">
            {document.title}
          </Text>
          <Text variant="label" color="muted">
            {tText('legal.updated', { date: updated })}
          </Text>
        </View>
        {document.summary && (
          <View className="gap-12 rounded-card bg-surface p-16">
            <Text variant="title-s" accessibilityRole="header">
              {tText('legal.summary')}
            </Text>
            {document.summary.map((sentence, index) => (
              <View key={sentence} className="flex-row gap-12">
                <Icon name={summaryIcons[index] ?? 'info'} size="icon-l" />
                <Text variant="body" className="flex-1">
                  {sentence}
                </Text>
              </View>
            ))}
          </View>
        )}
        {document.sections.map((section) => (
          <View key={section.title} className="gap-8">
            <Text variant="title-s" accessibilityRole="header">
              {section.title}
            </Text>
            {blocksOf(section.body).map((block, index) => (
              <LegalBlock key={index} block={block} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Bold runs inside the text of the article, in the 700 weight of the same size. */
function Spans({ spans }: { spans: Span[] }) {
  return spans.map((span, index) =>
    span.isBold ? (
      <NativeText key={index} style={{ fontFamily: fontFamilies['700'] }}>
        {span.text}
      </NativeText>
    ) : (
      <Fragment key={index}>{span.text}</Fragment>
    ),
  );
}

/** A paragraph, a bulleted list, or a table read row by row, each cell under its header. */
function LegalBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case 'paragraph':
      return (
        <Text variant="body">
          <Spans spans={block.spans} />
        </Text>
      );
    case 'list':
      return (
        <View accessibilityRole="list" className="gap-4">
          {block.items.map((item, index) => (
            <View key={index} className="flex-row gap-8">
              <Text variant="body" accessibilityElementsHidden importantForAccessibility="no">
                •
              </Text>
              <Text variant="body" className="flex-1">
                <Spans spans={item} />
              </Text>
            </View>
          ))}
        </View>
      );
    case 'table':
      return (
        <View>
          {block.rows.map((row, index) => (
            <View key={index} className="gap-8 border-b border-line py-12">
              {row.cells.map((cell, cellIndex) => (
                <View key={cellIndex} className="gap-4">
                  {cell.header !== '' && (
                    <Text variant="status" color="muted">
                      {cell.header}
                    </Text>
                  )}
                  <Text variant="body">
                    <Spans spans={cell.value} />
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
  }
}

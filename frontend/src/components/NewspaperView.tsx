import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useResponsive } from '../hooks/useResponsive';
import { spacing } from '../theme';
import { NewspaperSection } from '../types';
import { resolveMediaUrl } from '../services/family.service';
import {
  NP,
  INK,
  INK_MUTED,
  INK_LIGHT,
  PAPER,
  PAPER_LINE,
  PAPER_RULE,
  deskLabel,
  splitLines,
  splitSentences,
} from '../theme/newspaperTypography';

interface NewspaperViewProps {
  title: string;
  editionDate: string;
  sections: NewspaperSection[];
  familyName?: string;
  onShare?: () => void;
}

function Rule({ thick }: { thick?: boolean }) {
  return <View style={[styles.rule, thick && styles.ruleThick, { backgroundColor: PAPER_LINE }]} />;
}

function ThinRule() {
  return <View style={[styles.thinRule, { backgroundColor: PAPER_RULE }]} />;
}

function SectionDesk({ label }: { label: string }) {
  return (
    <View style={styles.deskRow}>
      <Text style={styles.deskLabel}>{label.toUpperCase()}</Text>
      <View style={styles.deskRule} />
    </View>
  );
}

function DropCapBody({ text }: { text: string }) {
  if (!text) return null;
  const first = text.charAt(0);
  const rest = text.slice(1);
  return (
    <Text style={styles.bodyText}>
      <Text style={styles.dropCap}>{first}</Text>
      {rest}
    </Text>
  );
}

function PhotoFigure({
  uri,
  caption,
  figureNum,
  width,
  float,
}: {
  uri: string;
  caption: string;
  figureNum: number;
  width: number;
  float?: boolean;
}) {
  return (
    <View style={[styles.figure, float && styles.figureFloat, { width: float ? width : '100%' }]}>
      <Image source={{ uri }} style={[styles.figureImage, { width: float ? width : '100%' }]} contentFit="cover" />
      <Text style={styles.figureCaption}>
        FIG. {figureNum} — {caption}
      </Text>
    </View>
  );
}

function ColumnText({ paragraphs, columns }: { paragraphs: string[]; columns: number }) {
  if (paragraphs.length === 0) return null;

  if (columns <= 1) {
    return (
      <View style={styles.columnStack}>
        {paragraphs.map((p, i) => (
          i === 0 ? <DropCapBody key={p} text={p} /> : (
            <Text key={p} style={[styles.bodyText, styles.bodyPara]}>{p}</Text>
          )
        ))}
      </View>
    );
  }

  const perCol = Math.ceil(paragraphs.length / columns);
  const cols: string[][] = [];
  for (let c = 0; c < columns; c++) {
    cols.push(paragraphs.slice(c * perCol, (c + 1) * perCol));
  }

  return (
    <View style={styles.columnRow}>
      {cols.map((colParas, ci) => (
        <React.Fragment key={`col-${ci}`}>
          {ci > 0 && <View style={styles.columnRule} />}
          <View style={styles.column}>
            {colParas.map((p, pi) =>
              ci === 0 && pi === 0 ? (
                <DropCapBody key={p} text={p} />
              ) : (
                <Text key={p} style={[styles.bodyText, styles.bodyPara]}>{p}</Text>
              )
            )}
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

function ArticleBlock({
  section,
  figureNum,
  columnCount,
  contentWidth,
  isLead,
}: {
  section: NewspaperSection;
  figureNum: number;
  columnCount: number;
  contentWidth: number;
  isLead?: boolean;
}) {
  const imageUri = resolveMediaUrl(section.imageUrl);
  const desk = deskLabel(section.type);
  const lines = splitLines(section.content);
  const sentences = splitSentences(section.content);
  const isPhoto = section.type === 'photo_of_day' || (imageUri && !isLead);
  const isList = section.type === 'upcoming_events' || section.type === 'weekly_stats';

  if (isLead) {
    const floatWidth = columnCount >= 2 ? Math.min(contentWidth * 0.38, 220) : contentWidth - spacing.lg * 2;
    return (
      <View style={styles.leadBlock}>
        <SectionDesk label={desk} />
        <Text style={styles.leadHeadline}>{section.title.toUpperCase()}</Text>
        <Text style={styles.leadDeck}>{splitSentences(section.content)[0] ?? section.content}</Text>
        <ThinRule />
        <Text style={styles.byline}>By Famora Staff · Family Correspondent</Text>

        <View style={columnCount >= 2 ? styles.leadRow : undefined}>
          {imageUri && (
            <PhotoFigure
              uri={imageUri}
              caption={section.title}
              figureNum={figureNum}
              width={floatWidth}
              float={columnCount >= 2}
            />
          )}
          <View style={columnCount >= 2 ? styles.leadTextCol : undefined}>
            <ColumnText
              paragraphs={sentences.length > 1 ? sentences : [section.content]}
              columns={columnCount >= 2 ? Math.min(columnCount, 2) : 1}
            />
          </View>
        </View>
      </View>
    );
  }

  if (isPhoto && imageUri) {
    return (
      <View style={styles.article}>
        <SectionDesk label={desk} />
        <Text style={styles.articleHeadline}>{section.title}</Text>
        <PhotoFigure uri={imageUri} caption={section.content || section.title} figureNum={figureNum} width={contentWidth - spacing.lg * 2} />
      </View>
    );
  }

  if (isList) {
    return (
      <View style={styles.article}>
        <SectionDesk label={desk} />
        <Text style={styles.articleHeadline}>{section.title}</Text>
        <View style={styles.bulletBox}>
          {lines.map((line) => (
            <View key={line} style={styles.bulletRow}>
              <Text style={styles.bulletMark}>—</Text>
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.article}>
      <SectionDesk label={desk} />
      <Text style={styles.articleHeadline}>{section.title}</Text>
      {imageUri ? (
        <PhotoFigure uri={imageUri} caption={section.title} figureNum={figureNum} width={contentWidth - spacing.lg * 2} />
      ) : null}
      <ColumnText paragraphs={sentences.length > 0 ? sentences : [section.content]} columns={1} />
    </View>
  );
}

export function NewspaperView({ title, editionDate, sections, familyName, onShare }: NewspaperViewProps) {
  const { contentMaxWidth, isWide, isMedium } = useResponsive();
  const columnCount = isWide ? 3 : isMedium ? 2 : 1;
  const contentWidth = contentMaxWidth - spacing.lg * 2;

  const date = new Date(editionDate);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const priceLine = 'Private Edition · Not for Resale';

  let figureCounter = 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.sheet, { maxWidth: contentMaxWidth }]}>
        {/* Masthead */}
        <View style={styles.masthead}>
          <View style={styles.mastheadMetaRow}>
            <Text style={styles.metaLeft}>{priceLine}</Text>
            <Text style={styles.metaRight}>VOL. I · NO. {date.getDate()}</Text>
          </View>
          <Text style={styles.mastheadTitle}>{title.toUpperCase()}</Text>
          {familyName ? (
            <Text style={styles.mastheadTagline}>Serving the {familyName} Household</Text>
          ) : (
            <Text style={styles.mastheadTagline}>{"All The News That's Fit To Share"}</Text>
          )}
          <Rule thick />
          <Rule />
          <View style={styles.datelineRow}>
            <Text style={styles.dateline}>{formattedDate.toUpperCase()}</Text>
            <Text style={styles.datelineCenter}>★ ★ ★</Text>
            <Text style={styles.dateline}>{sections.length} Articles Today</Text>
          </View>
          <ThinRule />
        </View>

        {sections.length === 0 ? (
          <View style={styles.emptyPaper}>
            <Text style={styles.emptyHeadline}>NO EDITION TODAY</Text>
            <Text style={styles.bodyText}>Check back after your family shares photos and events.</Text>
          </View>
        ) : (
          <>
            <ArticleBlock
              section={sections[0]}
              figureNum={++figureCounter}
              columnCount={columnCount}
              contentWidth={contentWidth}
              isLead
            />

            <Rule thick />

            {isWide || isMedium ? (
              <View style={styles.bottomGrid}>
                {Array.from({ length: columnCount }, (_, colIndex) => (
                  <View
                    key={`col-${colIndex}`}
                    style={[styles.gridColumn, colIndex < columnCount - 1 && styles.gridCellBorder]}
                  >
                    {sections
                      .slice(1)
                      .filter((_, i) => i % columnCount === colIndex)
                      .map((section, i) => (
                        <View key={`${section.type}-${colIndex}-${i}`}>
                          {i > 0 && <ThinRule />}
                          <ArticleBlock
                            section={section}
                            figureNum={section.imageUrl ? ++figureCounter : figureCounter}
                            columnCount={1}
                            contentWidth={contentWidth / columnCount}
                          />
                        </View>
                      ))}
                  </View>
                ))}
              </View>
            ) : (
              sections.slice(1).map((section, i) => (
                <React.Fragment key={`${section.type}-${i}`}>
                  <ThinRule />
                  <ArticleBlock
                    section={section}
                    figureNum={section.imageUrl ? ++figureCounter : figureCounter}
                    columnCount={1}
                    contentWidth={contentWidth}
                  />
                </React.Fragment>
              ))
            )}
          </>
        )}

        <Rule thick />
        <View style={styles.footer}>
          <Text style={styles.footerLine}>{title} · {formattedDate}</Text>
          <Text style={styles.footerFine}>Printed digitally for your family. Contents remain private.</Text>
        </View>
      </View>

      {onShare && (
        <Pressable onPress={onShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Export PDF</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#E8E4DC' },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: PAPER_LINE,
    ...Platform.select({
      web: { boxShadow: '0 4px 24px rgba(0,0,0,0.15)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  masthead: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  mastheadMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.sm,
  },
  metaLeft: { ...NP.sans, fontSize: 9, color: INK_LIGHT, letterSpacing: 0.5 },
  metaRight: { ...NP.sans, fontSize: 9, color: INK_LIGHT, letterSpacing: 0.5 },
  mastheadTitle: {
    ...NP.masthead,
    fontSize: 42,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 46,
  },
  mastheadTagline: {
    ...NP.body,
    fontSize: 13,
    fontStyle: 'italic',
    color: INK_MUTED,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  rule: { width: '100%', height: 1, marginVertical: 2 },
  ruleThick: { height: 3, marginVertical: 1 },
  thinRule: { width: '100%', height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  datelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.sm,
  },
  dateline: { ...NP.sans, fontSize: 10, color: INK_MUTED, letterSpacing: 0.8, flex: 1 },
  datelineCenter: { ...NP.body, fontSize: 10, color: INK_LIGHT, textAlign: 'center' },
  leadBlock: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  leadHeadline: {
    ...NP.headline,
    fontSize: 28,
    fontWeight: '700',
    color: INK,
    lineHeight: 32,
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  leadDeck: {
    ...NP.body,
    fontSize: 16,
    fontStyle: 'italic',
    color: INK_MUTED,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  byline: {
    ...NP.sans,
    fontSize: 10,
    color: INK_LIGHT,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  leadRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  leadTextCol: { flex: 1 },
  deskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.sm },
  deskLabel: { ...NP.sans, fontSize: 10, fontWeight: '700', color: INK, letterSpacing: 1.2 },
  deskRule: { flex: 1, height: 1, backgroundColor: PAPER_LINE },
  bodyText: {
    ...NP.body,
    fontSize: 15,
    lineHeight: 22,
    color: INK,
    textAlign: 'justify',
  },
  bodyPara: { marginTop: spacing.sm },
  dropCap: {
    ...NP.masthead,
    fontSize: 52,
    lineHeight: 48,
    fontWeight: '700',
    color: INK,
  },
  columnStack: { gap: 0 },
  columnRow: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, paddingHorizontal: spacing.xs },
  columnRule: { width: 1, backgroundColor: PAPER_RULE, alignSelf: 'stretch', marginHorizontal: spacing.sm },
  figure: { marginBottom: spacing.md },
  figureFloat: { marginRight: spacing.sm },
  figureImage: { height: 180, borderWidth: 1, borderColor: PAPER_LINE },
  figureCaption: {
    ...NP.body,
    fontSize: 11,
    fontStyle: 'italic',
    color: INK_MUTED,
    marginTop: 4,
    lineHeight: 15,
  },
  article: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  articleHeadline: {
    ...NP.headline,
    fontSize: 18,
    fontWeight: '700',
    color: INK,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bulletBox: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: PAPER_LINE, paddingVertical: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: 3 },
  bulletMark: { ...NP.body, fontSize: 14, color: INK, width: 12 },
  bulletText: { ...NP.body, fontSize: 14, color: INK, flex: 1, lineHeight: 20 },
  bottomGrid: { flexDirection: 'row', alignItems: 'flex-start' },
  gridColumn: { flex: 1, paddingBottom: spacing.md },
  gridCellBorder: { borderRightWidth: 1, borderRightColor: PAPER_RULE },
  emptyPaper: { padding: spacing.xl, alignItems: 'center' },
  emptyHeadline: { ...NP.headline, fontSize: 22, fontWeight: '700', color: INK, marginBottom: spacing.sm },
  footer: { padding: spacing.lg, alignItems: 'center', gap: 4 },
  footerLine: { ...NP.sans, fontSize: 10, color: INK_MUTED, textAlign: 'center' },
  footerFine: { ...NP.body, fontSize: 10, fontStyle: 'italic', color: INK_LIGHT, textAlign: 'center' },
  shareBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: PAPER_LINE,
    backgroundColor: PAPER,
  },
  shareBtnText: { ...NP.sans, fontSize: 12, fontWeight: '600', color: INK, letterSpacing: 0.5 },
});

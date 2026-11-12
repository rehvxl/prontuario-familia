import { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState, GlassSurface, IconButton, Spinner, Text, errorMessage, useTheme } from '@/shared/ui';
import { useAttachmentUrl, type Attachment } from '@/entities/health-record';
import { openPdfOnAndroid } from '../lib/open-pdf-android';

export interface AttachmentViewerProps {
  /** Anexo a mostrar; `null` fecha. */
  attachment: Attachment | null;
  onClose: () => void;
}

const isPdf = (a: Attachment) => a.mimeType === 'application/pdf';

/**
 * Visualizador de anexo. Imagem: tela cheia (expo-image). PDF: iOS no `react-native-webview`;
 * Android baixa para o cache e abre no leitor do sistema (expo-intent-launcher). docs/ARCHITECTURE.md, ADR 11.
 */
export function AttachmentViewer({ attachment, onClose }: AttachmentViewerProps) {
  if (!attachment) return null;
  return <Viewer attachment={attachment} onClose={onClose} />;
}

function Viewer({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const url = useAttachmentUrl(attachment.storagePath);
  const [androidError, setAndroidError] = useState<string | null>(null);
  const androidPdf = Platform.OS === 'android' && isPdf(attachment);
  const uri = url.data;

  useEffect(() => {
    if (!androidPdf || !uri) return;
    let cancelled = false;
    openPdfOnAndroid(uri, attachment.fileName)
      .then(() => {
        if (!cancelled) onClose();
      })
      .catch((error: unknown) => {
        if (!cancelled) setAndroidError(errorMessage(error, 'Não foi possível abrir o PDF. Verifique se há um leitor de PDF instalado.'));
      });
    return () => {
      cancelled = true;
    };
    // `onClose` muda a cada render do chamador; a abertura roda uma vez por URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [androidPdf, uri, attachment.fileName]);

  // v3: vidro só sobre imagem (DESIGN_SYSTEM.md §4.2); no PDF e nos estados, superfície sólida.
  const overImage = !isPdf(attachment) && !!uri && !url.isError;
  let body;
  if (url.isError || androidError) {
    body = (
      <EmptyState
        tone="error"
        title="Não foi possível abrir o arquivo"
        message={androidError ?? 'Verifique a conexão e tente de novo. O arquivo continua guardado.'}
        action={{ label: 'Fechar', onPress: onClose }}
      />
    );
  } else if (!uri || androidPdf) {
    body = <Spinner fill label={androidPdf && uri ? 'Abrindo o PDF…' : 'Carregando…'} />;
  } else if (isPdf(attachment)) {
    body = (
      <WebView
        testID="pdf-webview"
        source={{ uri }}
        originWhitelist={['*']}
        allowFileAccess
        allowingReadAccessToURL={uri}
        startInLoadingState
        renderLoading={() => <Spinner fill label="Carregando o PDF…" />}
        accessibilityLabel={`PDF ${attachment.fileName}`}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      />
    );
  } else {
    body = (
      <Image
        testID="attachment-image"
        source={{ uri }}
        contentFit="contain"
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityLabel={`Imagem ${attachment.fileName}`}
        transition={150}
      />
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: theme.colors.surfaceSunken }]} accessibilityViewIsModal>
        <View style={[styles.header, { paddingTop: insets.top + theme.space[2], paddingHorizontal: theme.layout.screenGutter }]}>
          {overImage ? (
            // Sobre a imagem, o nome vai numa cápsula de vidro (fallback sólido sem vidro) para continuar legível.
            <View style={styles.flex}>
              <GlassSurface shape="capsule" style={[styles.namePill, { paddingHorizontal: theme.space[4], minHeight: theme.minTouchTarget }]}>
                <Text variant="headline" numberOfLines={1}>
                  {attachment.fileName}
                </Text>
              </GlassSurface>
            </View>
          ) : (
            <Text variant="headline" numberOfLines={1} style={styles.flex}>
              {attachment.fileName}
            </Text>
          )}
          <IconButton icon="close" variant={overImage ? 'glass' : 'tonal'} accessibilityLabel="Fechar arquivo" onPress={onClose} testID="viewer-close" />
        </View>
        {/* Imagem em tela cheia por baixo do cabeçalho: é sobre ela que o vidro faz sentido. */}
        <View style={overImage ? StyleSheet.absoluteFill : styles.body}>{body}</View>
        {isPdf(attachment) && Platform.OS === 'ios' ? (
          <View style={{ paddingBottom: insets.bottom + theme.space[2], paddingHorizontal: theme.layout.screenGutter }}>
            <Button label="Fechar" variant="bordered" onPress={onClose} fullWidth />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8, zIndex: 2 },
  body: { flex: 1 },
  flex: { flex: 1 },
  namePill: { alignSelf: 'flex-start', maxWidth: '100%', justifyContent: 'center' },
});

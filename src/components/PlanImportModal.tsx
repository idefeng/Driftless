import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { useCadence } from '../state/CadenceContext';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import { useI18n } from '../i18n/I18nContext';

interface PlanImportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PlanImportModal({ visible, onClose }: PlanImportModalProps) {
  const { c } = useTheme();
  const { t } = useI18n();
  const { importPlan } = useCadence();
  const [jsonText, setJsonText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleImport = () => {
    setErrorMsg('');
    if (!jsonText.trim()) {
      setErrorMsg(t('language.title') === '语言' ? '请输入 JSON 数据' : 'JSON payload is empty');
      return;
    }
    try {
      const parsed = JSON.parse(jsonText.trim());
      if (typeof parsed !== 'object' || !parsed) {
        throw new Error('Invalid JSON format');
      }
      importPlan(parsed);
      setJsonText('');
      onClose();
      Alert.alert(
        t('language.title') === '语言' ? '导入成功' : 'Import Successful',
        t('language.title') === '语言' ? '新训练计划已成功导入并设为当前计划！' : 'Plan has been imported!',
      );
    } catch {
      setErrorMsg(
        t('language.title') === '语言'
          ? 'JSON 格式解析失败，请检查数据格式'
          : 'Invalid JSON payload structure',
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text }]}>
            {t('language.title') === '语言' ? '导入训练计划' : 'Import Training Plan'}
          </Text>
          <Text style={[styles.subtitle, { color: c.textFaint }]}>
            {t('language.title') === '语言'
              ? '粘贴离线 JSON 数据以添加新计划'
              : 'Paste plan JSON data to import'}
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                color: c.text,
                backgroundColor: c.cardAlt,
                borderColor: errorMsg ? '#FF3333' : c.divider,
              },
            ]}
            placeholder={
              t('language.title') === '语言'
                ? '在此粘贴 JSON 文本...'
                : 'Paste JSON data here...'
            }
            placeholderTextColor={c.textFaint}
            multiline
            numberOfLines={5}
            value={jsonText}
            onChangeText={(txt) => {
              setJsonText(txt);
              if (errorMsg) setErrorMsg('');
            }}
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.cancelButton, { backgroundColor: c.cardAlt }]} onPress={onClose}>
              <Text style={[styles.buttonText, { color: c.text }]}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={[styles.button, { backgroundColor: c.brand }]} onPress={handleImport}>
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {t('language.title') === '语言' ? '确定导入' : 'Import'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.card,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 110,
    borderRadius: radius.pill,
    padding: 12,
    borderWidth: 1,
    textAlignVertical: 'top',
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: '#FF3333',
    marginTop: 6,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
  },
});

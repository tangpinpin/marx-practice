import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

if (Capacitor.isNativePlatform()) {
  window.MarxNativeExport = async (filename, content) => {
    await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
    await Share.share({ title: filename, url: uri, dialogTitle: '导出文件' });
  };
}

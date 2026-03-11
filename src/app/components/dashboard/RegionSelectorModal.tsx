import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { Region } from "@/utils/regions";
import { getCityCoords } from "@/services/city-coords";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RegionSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (region: { province: Region; city: Region; district: Region }) => void;
  defaultRegion?: { province: Region; city: Region; district: Region };
}

export function RegionSelectorModal({
  open,
  onOpenChange,
  onSelect,
  defaultRegion,
}: RegionSelectorModalProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCoords, setFetchingCoords] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [province, setProvince] = useState<Region | undefined>(defaultRegion?.province);
  const [city, setCity] = useState<Region | undefined>(defaultRegion?.city);
  const [district, setDistrict] = useState<Region | undefined>(defaultRegion?.district);

  // Load regions data
  useEffect(() => {
    if (open && regions.length === 0) {
      setLoading(true);
      fetch('./data/level.json')
        .then(res => {
          if (!res.ok) throw new Error('Failed to load regions data');
          return res.json();
        })
        .then(data => {
          setRegions(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load regions:', err);
          setError('加载地区数据失败');
          setLoading(false);
        });
    }
  }, [open, regions.length]);

  // Reset state when modal opens
  useEffect(() => {
    if (open && defaultRegion) {
      // 这里的逻辑有点复杂，因为我们需要等待 regions 加载完成才能正确匹配
      // 但由于 Select 组件只存了对象，我们可以直接用 defaultRegion 来初始化
      // 不过为了确保对象引用一致（如果需要），可以在 regions 加载后做一次 sync
      // 目前为了简化，直接信任 defaultRegion
      setProvince(defaultRegion.province);
      setCity(defaultRegion.city);
      setDistrict(defaultRegion.district);
    }
  }, [open, defaultRegion]);

  const handleProvinceChange = (value: string) => {
    let selected = regions.find((r) => r.code === value);
    setError(null);

    // 特殊处理直辖市：北京(11), 天津(12), 上海(31), 重庆(50)
    // 如果是直辖市，且数据结构缺失中间的“市”级（即 children 直接是区县），则构造虚拟城市节点
    if (selected && ['11', '12', '31', '50'].includes(selected.code.substring(0, 2))) {
      // 检查是否已经是处理过的结构（避免重复处理）或原始结构确实只有两级
      if (selected.children && selected.children.length > 0 && !selected.children[0].children) {
        const virtualCity: Region = {
          code: selected.code, // 复用代码
          name: selected.name, // 使用省名作为市名
          children: selected.children // 原来的区县列表
        };

        selected = {
          ...selected,
          children: [virtualCity]
        };
      }
    }

    setProvince(selected);
    setCity(undefined);
    setDistrict(undefined);
  };

  const handleCityChange = (value: string) => {
    const selected = province?.children?.find((r) => r.code === value);
    setCity(selected);
    setDistrict(undefined);
    setError(null);
  };

  const handleDistrictChange = (value: string) => {
    const selected = city?.children?.find((r) => r.code === value);
    setDistrict(selected);
    setError(null);
  };

  const handleConfirm = async () => {
    if (province && city && district) {
      try {
        setFetchingCoords(true);
        const coords = await getCityCoords(district.code);
        if (coords) {
          onSelect({
            province,
            city,
            district: { ...district, lat: coords.lat, lon: coords.lon }
          });
        } else {
          toast.warning(`未找到 ${district.name} 的坐标数据，天气将使用默认位置`);
          onSelect({ province, city, district: { ...district } });
        }
        onOpenChange(false);
      } catch (e) {
        toast.error('加载坐标数据失败');
        onSelect({ province, city, district: { ...district } });
        onOpenChange(false);
      } finally {
        setFetchingCoords(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>选择地区</DialogTitle>
          <DialogDescription className="sr-only">
            选择省份、城市和区县，用于同步当前天气数据。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">正在加载全国行政区划数据...</span>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-2 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium">省份</span>
              <Select onValueChange={handleProvinceChange} value={province?.code}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择省份" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {regions.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium">城市</span>
              <Select
                onValueChange={handleCityChange}
                value={city?.code}
                disabled={!province || !province.children}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择城市" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {province?.children?.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium">区县</span>
              <Select
                onValueChange={handleDistrictChange}
                value={district?.code}
                disabled={!city || !city.children}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择区县" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {city?.children?.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            data-testid="region-confirm"
            onClick={handleConfirm}
            disabled={!province || !city || !district || loading || fetchingCoords}
          >
            {fetchingCoords ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                同步天气...
              </>
            ) : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

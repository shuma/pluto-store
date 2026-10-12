import { api, assertOrigin } from "@/lib/http";
import { assetUpload, finishAsset } from "@/lib/stores/assets";
export async function POST(r: Request) {
  return api(async () => {
    assertOrigin(r);
    return assetUpload(await r.json());
  });
}
export async function PATCH(r: Request) {
  return api(async () => {
    assertOrigin(r);
    return finishAsset(await r.json());
  });
}

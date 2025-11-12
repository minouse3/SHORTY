import Header from "@/components/header";
import KitchenPanel from "@/components/dashboard/kitchen-panel";
import FrontDoorPanel from "@/components/dashboard/front-door-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Tabs defaultValue="kitchen" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kitchen">Kitchen</TabsTrigger>
            <TabsTrigger value="front-door">Front Door</TabsTrigger>
          </TabsList>
          <TabsContent value="kitchen">
            <div className="mt-6">
              <KitchenPanel />
            </div>
          </TabsContent>
          <TabsContent value="front-door">
             <div className="mt-6">
              <FrontDoorPanel />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

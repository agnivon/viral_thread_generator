/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { NewsThreadFactoryGraph } from "./news/graph";
import { SocialMediaThreadFactoryGraph } from "./social_media/graph";
import { TopicThreadFactoryGraph } from "./topic/graph";

test("NewsThreadFactoryGraph - structure & node compilation", () => {
  expect(NewsThreadFactoryGraph).toBeDefined();
  expect(typeof NewsThreadFactoryGraph.invoke).toBe("function");
});

test("SocialMediaThreadFactoryGraph - structure & node compilation", () => {
  expect(SocialMediaThreadFactoryGraph).toBeDefined();
  expect(typeof SocialMediaThreadFactoryGraph.invoke).toBe("function");
});

test("TopicThreadFactoryGraph - structure & node compilation", () => {
  expect(TopicThreadFactoryGraph).toBeDefined();
  expect(typeof TopicThreadFactoryGraph.invoke).toBe("function");
});

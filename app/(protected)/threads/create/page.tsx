"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useAction } from "convex/react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, Controller, useWatch, Control, UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2, Sparkles, Link as LinkIcon, HelpCircle, TrendingUp, SlidersHorizontal, BarChart3, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createThreadsFormSchema,
  createDefaultEntry,
  type CreateThreadsFormData,
} from "./schema";

interface ThreadEntryCardProps {
  index: number;
  control: Control<CreateThreadsFormData>;
  register: UseFormRegister<CreateThreadsFormData>;
  setValue: UseFormSetValue<CreateThreadsFormData>;
  errors: FieldErrors<CreateThreadsFormData>;
  isLoading: boolean;
  canRemove: boolean;
  onRemove: () => void;
}

function ThreadEntryCard({
  index,
  control,
  register,
  setValue,
  errors,
  isLoading,
  canRemove,
  onRemove,
}: ThreadEntryCardProps) {
  const currentAgent = useWatch({
    control,
    name: `entries.${index}.agent`,
  });

  const entryErrors = errors.entries?.[index];

  return (
    <Card 
      className="group relative overflow-hidden bg-card/40 backdrop-blur-xs border-border/80 hover:border-violet-500/30 hover:shadow-lg transition-all duration-300"
    >
      {/* Accent Highlight Line on Card Hover */}
      <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/30 bg-muted/20 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-xs font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
            {String(index + 1).padStart(2, "0")}
          </span>
          <CardTitle className="text-base font-bold text-foreground">
            Thread Source Entry
          </CardTitle>
        </div>
        {canRemove && (
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            aria-label="Remove entry"
            onClick={onRemove}
            disabled={isLoading}
            className="h-9 w-9 sm:h-8 sm:w-8 min-h-9 min-w-9 sm:min-h-8 sm:min-w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Content URL Input / Topic Input */}
        {currentAgent !== "topic" ? (
          <div className="space-y-1.5">
            <Label 
              htmlFor={`entries.${index}.url`} 
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5 text-indigo-500" /> Content URL
            </Label>
            <Input
              id={`entries.${index}.url`}
              type="url"
              placeholder="https://example.com/my-awesome-post"
              disabled={isLoading}
              {...register(`entries.${index}.url`)}
              className="w-full bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 rounded-lg transition-all"
            />
            {entryErrors?.url && (
              <p className="text-xs font-medium text-destructive mt-1">
                {entryErrors.url.message}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label 
                htmlFor={`entries.${index}.topic`} 
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Topic
              </Label>
              <Input
                id={`entries.${index}.topic`}
                type="text"
                placeholder="e.g. The history of artificial intelligence"
                disabled={isLoading}
                {...register(`entries.${index}.topic`)}
                className="w-full bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 rounded-lg transition-all"
              />
              {entryErrors?.topic && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {entryErrors.topic.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label 
                htmlFor={`entries.${index}.description`} 
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Topic Description (Optional)
              </Label>
              <textarea
                id={`entries.${index}.description`}
                placeholder="Add any specific context or angles you want the agent to focus on when researching this topic..."
                disabled={isLoading}
                {...register(`entries.${index}.description`)}
                className="flex min-h-15 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Agent Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Choose Agent Role
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setValue(`entries.${index}.agent`, "news", { shouldValidate: true })}
              disabled={isLoading}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all duration-300 text-center cursor-pointer ${
                currentAgent === "news" || !currentAgent
                  ? "border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50"
                  : "border-border/80 bg-background/40 hover:border-violet-500/30 hover:bg-muted/10"
              }`}
            >
              <span className="text-xs font-bold text-foreground">News Editor</span>
              <span className="text-[10px] text-muted-foreground mt-1">Factual, journalistic layout</span>
            </button>
            <button
              type="button"
              onClick={() => setValue(`entries.${index}.agent`, "social_media", { shouldValidate: true })}
              disabled={isLoading}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all duration-300 text-center cursor-pointer ${
                currentAgent === "social_media"
                  ? "border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50"
                  : "border-border/80 bg-background/40 hover:border-violet-500/30 hover:bg-muted/10"
              }`}
            >
              <span className="text-xs font-bold text-foreground">Social Specialist</span>
              <span className="text-[10px] text-muted-foreground mt-1">Punchy, hook-focused copy</span>
            </button>
            <button
              type="button"
              onClick={() => setValue(`entries.${index}.agent`, "topic", { shouldValidate: true })}
              disabled={isLoading}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all duration-300 text-center cursor-pointer ${
                currentAgent === "topic"
                  ? "border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50"
                  : "border-border/80 bg-background/40 hover:border-violet-500/30 hover:bg-muted/10"
              }`}
            >
              <span className="text-xs font-bold text-foreground">Topic Expert</span>
              <span className="text-[10px] text-muted-foreground mt-1">Deep dives from scratch</span>
            </button>
          </div>
        </div>

        {/* AI Guidance Textarea */}
        <div className="space-y-1.5">
          <Label 
            htmlFor={`entries.${index}.guidance`} 
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500" /> AI Guidance / Instructions (Optional)
          </Label>
          <textarea
            id={`entries.${index}.guidance`}
            placeholder="e.g., Focus on technical details, adopt an enthusiastic tone, or structure with numbered steps."
            disabled={isLoading}
            {...register(`entries.${index}.guidance`)}
            className="flex min-h-20 w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all"
          />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/75" /> Set tone instructions, specific callouts, or layout requirements for the generator.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 items-stretch">
          {/* Choose Hooks Manually Feature Card */}
          <Controller
            control={control}
            name={`entries.${index}.manual_hook_selection`}
            render={({ field }) => {
              const isChecked = Boolean(field.value);
              return (
                <label
                  htmlFor={`manual-hook-${index}`}
                  className={cn(
                    "group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                    isChecked
                      ? "bg-violet-500/[0.08] dark:bg-violet-950/25 border-violet-500/60 shadow-xs shadow-violet-500/10 ring-1 ring-violet-500/30"
                      : "bg-muted/10 border-border/40 hover:border-violet-500/30 hover:bg-muted/20",
                    isLoading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Top Bar: Icon + Badge + Switch */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex items-center justify-center size-8 rounded-lg transition-colors",
                              isChecked
                                ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                                : "bg-muted text-muted-foreground group-hover:text-foreground"
                            )}
                          >
                            <SlidersHorizontal className="size-4" />
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors",
                              isChecked
                                ? "bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold"
                                : "bg-muted/60 text-muted-foreground/75"
                            )}
                          >
                            Interactive
                          </span>
                        </div>
                        <Switch
                          id={`manual-hook-${index}`}
                          checked={isChecked}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-foreground group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors block">
                          Choose hooks manually
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Pause the pipeline to inspect and select your preferred hook before generating.
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              );
            }}
          />

          {/* Generate Editorial Infographic Feature Card */}
          <Controller
            control={control}
            name={`entries.${index}.infographic_generation`}
            render={({ field }) => {
              const isChecked = Boolean(field.value);
              return (
                <label
                  htmlFor={`infographic-gen-${index}`}
                  className={cn(
                    "group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                    isChecked
                      ? "bg-violet-500/[0.08] dark:bg-violet-950/25 border-violet-500/60 shadow-xs shadow-violet-500/10 ring-1 ring-violet-500/30"
                      : "bg-muted/10 border-border/40 hover:border-violet-500/30 hover:bg-muted/20",
                    isLoading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Top Bar: Icon + Badge + Switch */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex items-center justify-center size-8 rounded-lg transition-colors",
                              isChecked
                                ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                                : "bg-muted text-muted-foreground group-hover:text-foreground"
                            )}
                          >
                            <BarChart3 className="size-4" />
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors",
                              isChecked
                                ? "bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold"
                                : "bg-muted/60 text-muted-foreground/75"
                            )}
                          >
                            Visual Card
                          </span>
                        </div>
                        <Switch
                          id={`infographic-gen-${index}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            setValue(`entries.${index}.search_query_generation`, Boolean(checked));
                          }}
                          disabled={isLoading}
                        />
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-foreground group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors block">
                          Generate Editorial Infographic
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Design and render a high-authority data infographic card (FT / Bloomberg style).
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              );
            }}
          />

          {/* Deep Discovery Agent Feature Card */}
          <Controller
            control={control}
            name={`entries.${index}.discovery_agent`}
            render={({ field }) => {
              const isChecked = Boolean(field.value);
              return (
                <label
                  htmlFor={`discovery-agent-${index}`}
                  className={cn(
                    "group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                    isChecked
                      ? "bg-violet-500/[0.08] dark:bg-violet-950/25 border-violet-500/60 shadow-xs shadow-violet-500/10 ring-1 ring-violet-500/30"
                      : "bg-muted/10 border-border/40 hover:border-violet-500/30 hover:bg-muted/20",
                    isLoading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Top Bar: Icon + Badge + Switch */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex items-center justify-center size-8 rounded-lg transition-colors",
                              isChecked
                                ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                                : "bg-muted text-muted-foreground group-hover:text-foreground"
                            )}
                          >
                            <Radar className="size-4" />
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors",
                              isChecked
                                ? "bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold"
                                : "bg-muted/60 text-muted-foreground/75"
                            )}
                          >
                            Forensic Lens
                          </span>
                        </div>
                        <Switch
                          id={`discovery-agent-${index}`}
                          checked={isChecked}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-foreground group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors block">
                          Deep Discovery Agent
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Unearth non-obvious angles via BOM paradoxes, supply chain arbitrage, and regulatory mandates.
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CreateThreadForm() {
  const searchParams = useSearchParams();
  const urlTopic = searchParams.get("topic") || "";
  const urlDescription = searchParams.get("description") || "";
  const urlUrl = searchParams.get("url") || searchParams.get("sourceUrl") || "";
  const urlGuidance = searchParams.get("guidance") || "";
  const rawAgent = searchParams.get("agent");
  const rawDiscoveryAgent = searchParams.get("discovery_agent");
  const urlDiscoveryAgent = rawDiscoveryAgent === "true";
  const urlAgent: "news" | "social_media" | "topic" =
    rawAgent === "news" || rawAgent === "social_media" || rawAgent === "topic"
      ? rawAgent
      : urlTopic && !urlUrl
      ? "topic"
      : "news";

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateThreadsFormData>({
    resolver: zodResolver(createThreadsFormSchema),
    defaultValues: {
      entries: [
        createDefaultEntry({
          url: urlUrl,
          topic: urlTopic,
          description: urlDescription,
          guidance: urlGuidance,
          agent: urlAgent,
          manual_hook_selection: false,
          search_query_generation: false,
          discovery_agent: urlDiscoveryAgent,
        }),
      ],
    },
    mode: "onTouched",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  const enqueueThreadGeneration = useAction(api.actions.threads.enqueueThreadGeneration);
  const resolveArticleUrlAction = useAction(api.actions.googleTrends.resolveArticleUrl);
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  const createMutation = useMutation({
    mutationFn: async (payload: {
      requests: Array<{
        input_field:
          | { agent: "topic"; topic: string; description?: string }
          | { agent: "news" | "social_media"; url: string };
        guidance?: string;
        manual_hook_selection?: boolean;
        search_query_generation?: boolean;
        infographic_generation?: boolean;
        discovery_agent?: boolean;
      }>;
    }) => {
      return await enqueueThreadGeneration(payload);
    },
    onSuccess: () => {
      router.push("/threads/drafts");
    },
    onError: (err: unknown) => {
      console.error("Failed to enqueue thread generation:", err);
      const message = err instanceof Error ? err.message : "Failed to start thread generation. Please try again.";
      setError(message);
    },
  });

  const isLoading = createMutation.isPending;

  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (urlTopic || urlUrl) {
      hasInitializedRef.current = true;
      reset({
        entries: [
          createDefaultEntry({
            url: urlUrl,
            topic: urlTopic,
            description: urlDescription,
            guidance: urlGuidance,
            agent: urlAgent,
            manual_hook_selection: false,
            search_query_generation: false,
            discovery_agent: urlDiscoveryAgent,
          }),
        ],
      });
    }
  }, [urlTopic, urlUrl, urlDescription, urlGuidance, urlAgent, urlDiscoveryAgent, reset]);

  // Automatically resolve Google News redirect URLs to canonical publisher links if passed in query params
  useEffect(() => {
    if (urlUrl && urlUrl.includes("news.google.com/rss/articles/")) {
      let isMounted = true;
      resolveArticleUrlAction({ url: urlUrl })
        .then((resolvedUrl) => {
          if (isMounted && resolvedUrl && resolvedUrl !== urlUrl) {
            setValue("entries.0.url", resolvedUrl, { shouldValidate: true, shouldDirty: true });
          }
        })
        .catch((err) => {
          console.warn("Failed to resolve Google News URL in create form:", err);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [urlUrl, resolveArticleUrlAction, setValue]);

  const handleAddEntry = () => {
    append(createDefaultEntry());
  };

  const onSubmit = (data: CreateThreadsFormData) => {
    setError(null);

    const requests = data.entries.map((entry) => {
      const input_field =
        entry.agent === "topic"
          ? {
              agent: "topic" as const,
              topic: (entry.topic || "").trim(),
              ...(entry.description?.trim() ? { description: entry.description.trim() } : {}),
            }
          : {
              agent: entry.agent as "news" | "social_media",
              url: (entry.url || "").trim(),
            };

      return {
        input_field,
        guidance: entry.guidance?.trim() || undefined,
        manual_hook_selection: Boolean(entry.manual_hook_selection),
        search_query_generation: Boolean(entry.search_query_generation || entry.infographic_generation),
        infographic_generation: Boolean(entry.infographic_generation ?? entry.search_query_generation),
        discovery_agent: Boolean(entry.discovery_agent),
      };
    });

    createMutation.mutate({ requests });
  };

  return (
    <div className="flex-1 w-full bg-linear-to-b from-background via-background/95 to-background/50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-2.5 bg-violet-500/10 rounded-2xl text-violet-600 dark:text-violet-400 mb-2 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
              Create Viral Threads
            </span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-base sm:text-lg">
            Batch generate high-performance Threads sequences from articles, blog posts, or videos.
          </p>
        </div>

        {/* Pre-seeded from Emerging Trend or News Article Banner */}
        {(urlTopic || urlUrl) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-linear-to-r from-violet-500/10 via-indigo-500/10 to-transparent border border-violet-500/30 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-400 shrink-0">
                {urlAgent === "news" ? <Sparkles className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground capitalize">
                  {urlAgent === "news" ? (
                    <>
                      Pre-seeded Article for News Editor:{" "}
                      <span className="text-violet-600 dark:text-violet-400">{urlTopic || "Article Source"}</span>
                    </>
                  ) : (
                    <>
                      Pre-seeded from Emerging Trend Alert:{" "}
                      <span className="text-violet-600 dark:text-violet-400">{urlTopic}</span>
                    </>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {urlAgent === "news"
                    ? "Article URL and News Editor mode pre-selected. Review guidance below and generate."
                    : "Context and velocity were loaded automatically. Review angles below and generate."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                router.replace("/threads/create");
                reset({
                  entries: [createDefaultEntry()],
                });
              }}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-3 cursor-pointer shrink-0 self-end sm:self-auto"
            >
              Reset to Blank
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Entries Container */}
          <div className="space-y-6">
            {fields.map((field, index) => (
              <ThreadEntryCard
                key={field.id}
                index={index}
                control={control}
                register={register}
                setValue={setValue}
                errors={errors}
                isLoading={isLoading}
                canRemove={fields.length > 1}
                onRemove={() => remove(index)}
              />
            ))}
          </div>

          {/* Add Another Link Card Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleAddEntry}
              disabled={isLoading}
              className="w-full flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed border-border/80 hover:border-violet-500/40 rounded-xl bg-muted/5 hover:bg-violet-500/5 text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 font-medium transition-all duration-300 group focus:outline-none cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border/80 group-hover:scale-105 transition-transform duration-300">
                <Plus className="h-5 w-5" />
              </div>
              <span className="mt-2 text-sm font-semibold tracking-wide">Add another content link</span>
            </button>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="text-sm text-destructive text-center p-3.5 border border-destructive/20 rounded-xl bg-destructive/10 max-w-sm mx-auto w-full">
              {error}
            </div>
          )}

          {/* Form Actions / Submit */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-6 border-t border-border/40">
            <Button 
              type="submit" 
              size="lg"
              className="w-full sm:w-auto sm:min-w-60 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-6 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Threads...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate {fields.length === 1 ? "1 Thread" : `${fields.length} Threads`}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateThreadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full py-20 px-4 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500 mr-2" />
          <span className="text-sm font-medium">Loading thread creator...</span>
        </div>
      }
    >
      <CreateThreadForm />
    </Suspense>
  );
}

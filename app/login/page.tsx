"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  UserIcon, 
  BuildingIcon,
  HeartIcon,
  StethoscopeIcon,
  ArrowRightIcon
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
            Welcome to CareFlow
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
              Choose how you&apos;d like to continue
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link href="/login/patient">
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-500 group h-full">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-4 bg-blue-100 dark:bg-blue-900 rounded-full w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl">I&apos;m a Patient</CardTitle>
                  <CardDescription className="text-base">
                    Find healthcare services near you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <HeartIcon className="h-4 w-4 mr-2 text-blue-500" />
                    Access urgent care & clinics
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <StethoscopeIcon className="h-4 w-4 mr-2 text-blue-500" />
                    Book telehealth appointments
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <BuildingIcon className="h-4 w-4 mr-2 text-blue-500" />
                    Find nearby pharmacies
                  </div>
                  <div className="pt-4">
                    <Button className="w-full group-hover:bg-blue-600" variant="default">
                      Continue as Patient
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/login/provider">
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-green-500 group h-full">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-4 bg-green-100 dark:bg-green-900 rounded-full w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BuildingIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-2xl">I&apos;m a Provider</CardTitle>
                  <CardDescription className="text-base">
                    Manage your healthcare services
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <UserIcon className="h-4 w-4 mr-2 text-green-500" />
                    Manage patient requests
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <HeartIcon className="h-4 w-4 mr-2 text-green-500" />
                    Update service availability
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <StethoscopeIcon className="h-4 w-4 mr-2 text-green-500" />
                    View demand heatmaps
                  </div>
                  <div className="pt-4">
                    <Button className="w-full group-hover:bg-green-600" variant="default">
                      Continue as Provider
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="text-blue-600 hover:underline font-medium">
              Sign up here
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

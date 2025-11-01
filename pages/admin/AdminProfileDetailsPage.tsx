import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, UserIcon, PhoneIcon, InformationCircleIcon, DocumentTextIcon, ShareIcon, HandThumbUpIcon } from '@heroicons/react/24/solid';

const AdminProfileDetailsPage: React.FC = () => {
    const items = [
        { title: 'User Account & Security', path: '/admin/users', description: 'View and edit user profile details.', icon: UserIcon },
        { title: 'Contact Us Page', path: '/admin/profile-details/contact-us', description: 'Manage contact info and social media links.', icon: PhoneIcon },
        { title: 'About Us Page', path: '/admin/profile-details/about-us', description: 'Edit the content of the About Us page.', icon: InformationCircleIcon },
        { title: 'Privacy & Terms Page', path: '/admin/profile-details/privacy-policy', description: 'Edit privacy policy and terms of service.', icon: DocumentTextIcon },
        { title: 'Share App Settings', path: '/admin/profile-details/share-app', description: 'Manage the link shared from the app.', icon: ShareIcon },
        { title: 'Rate Our App Page', path: '/admin/profile-details/rate-app', description: 'View details about the static rating page.', icon: HandThumbUpIcon },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Site & Pages Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6 -mt-4">Manage user-facing pages and site-wide settings from one place.</p>
            <div className="space-y-4">
                {items.map(item => (
                    <Link key={item.path} to={item.path} className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <item.icon className="h-8 w-8 text-purple-500" />
                        <div className="ml-4 flex-1">
                            <p className="font-semibold text-gray-800 dark:text-gray-100">{item.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto" />
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default AdminProfileDetailsPage;
